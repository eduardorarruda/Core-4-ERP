package br.com.core4erp.notificacao.service;

import br.com.core4erp.cartaoCredito.entity.CartaoCredito;
import br.com.core4erp.cartaoCredito.repository.CartaoCreditoRepository;
import br.com.core4erp.cartaoCredito.service.CartaoCreditoService;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.repository.ContaRepository;
import br.com.core4erp.empresa.repository.EmpresaRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.TipoNotificacao;
import br.com.core4erp.notificacao.entity.Notificacao;
import br.com.core4erp.notificacao.repository.NotificacaoRepository;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.List;

@Service
public class SincronizacaoService {

    private final UsuarioRepository usuarioRepository;
    private final ContaRepository contaRepository;
    private final CartaoCreditoRepository cartaoRepository;
    private final CartaoCreditoService cartaoCreditoService;
    private final NotificacaoRepository notificacaoRepository;
    private final EmpresaRepository empresaRepository;
    private final UsuarioEmpresaRepository usuarioEmpresaRepository;
    private final SincronizacaoService self; // S.7: proxy para transação por empresa

    public SincronizacaoService(UsuarioRepository usuarioRepository,
                                ContaRepository contaRepository,
                                CartaoCreditoRepository cartaoRepository,
                                CartaoCreditoService cartaoCreditoService,
                                NotificacaoRepository notificacaoRepository,
                                EmpresaRepository empresaRepository,
                                UsuarioEmpresaRepository usuarioEmpresaRepository,
                                @Lazy SincronizacaoService self) {
        this.usuarioRepository = usuarioRepository;
        this.contaRepository = contaRepository;
        this.cartaoRepository = cartaoRepository;
        this.cartaoCreditoService = cartaoCreditoService;
        this.notificacaoRepository = notificacaoRepository;
        this.empresaRepository = empresaRepository;
        this.usuarioEmpresaRepository = usuarioEmpresaRepository;
        this.self = self;
    }

    /**
     * Regra 1: Contas PENDENTE com data de vencimento < hoje → marcar ATRASADO + notificação.
     * Regra 2: Cartões com dia_fechamento = hoje → notificação de FATURA.
     * Idempotente: não duplica notificações.
     */
    @Transactional
    public void sincronizar(Long empresaId) {
        cartaoCreditoService.gerarLancamentosAssinaturas(empresaId);
        sincronizarContasVencidas(empresaId);
        sincronizarFaturasCartao(empresaId);
    }

    /**
     * Sincroniza todas as empresas (chamada administrativa).
     * S.7: sem @Transactional aqui; cada empresa é sincronizada em sua própria transação
     * (via {@code self}, para que o proxy aplique o @Transactional de {@code sincronizar}),
     * isolando falhas — uma empresa com erro não derruba as demais.
     */
    public void sincronizarTodos() {
        empresaRepository.findIdsAtivas().forEach(self::sincronizar);
    }

    /** Gera lançamentos de assinaturas para todas as empresas às 7h diariamente. */
    @Scheduled(cron = "0 0 7 * * *")
    public void gerarAssinaturasScheduled() {
        empresaRepository.findIdsAtivas().forEach(cartaoCreditoService::gerarLancamentosAssinaturas);
    }

    // ── Regra 1 ──────────────────────────────────────────────────────────────

    private void sincronizarContasVencidas(Long empresaId) {
        List<Conta> vencidas = contaRepository
                .findByEmpresaIdAndStatusAndDataVencimentoBefore(empresaId, StatusConta.PENDENTE, LocalDate.now());

        vencidas.forEach(c -> c.setStatus(StatusConta.ATRASADO));
        contaRepository.saveAll(vencidas);

        if (vencidas.isEmpty()) return;
        // S.8: notifica TODOS os membros ativos da empresa (não só o criador da conta)
        List<Long> membros = membrosAtivos(empresaId);
        for (Conta conta : vencidas) {
            String msg = "Conta vencida: " + conta.getDescricao()
                    + " (vencimento: " + conta.getDataVencimento() + ")";
            for (Long uid : membros) {
                boolean jaNotificado = notificacaoRepository
                        .existsByUsuarioIdAndTipoAndReferenciaId(uid, TipoNotificacao.VENCIMENTO, conta.getId());
                if (!jaNotificado) {
                    criarNotificacao(uid, empresaId, msg, TipoNotificacao.VENCIMENTO, conta.getId());
                }
            }
        }
    }

    private List<Long> membrosAtivos(Long empresaId) {
        return usuarioEmpresaRepository.findByEmpresaIdAndAtivoTrue(empresaId)
                .stream().map(ue -> ue.getUsuario().getId()).distinct().toList();
    }

    // ── Regra 2 ──────────────────────────────────────────────────────────────

    private void sincronizarFaturasCartao(Long empresaId) {
        int diaHoje = LocalDate.now().getDayOfMonth();
        List<CartaoCredito> cartoes = cartaoRepository.findAllByEmpresaId(empresaId);

        List<Long> membros = membrosAtivos(empresaId);
        for (CartaoCredito cartao : cartoes) {
            if (!cartao.getDiaFechamento().equals(diaHoje)) continue;

            YearMonth mesAtual = YearMonth.now();
            LocalDateTime inicioDoDia = LocalDate.now().atStartOfDay();
            LocalDateTime fimDoDia = LocalDate.now().atTime(23, 59, 59);
            String msg = "Fatura do cartão " + cartao.getNome() + " fecha hoje (" +
                    String.format("%02d/%d", mesAtual.getMonthValue(), mesAtual.getYear()) + ")";

            // S.8: notifica todos os membros ativos da empresa
            for (Long uid : membros) {
                boolean jaNotificado = notificacaoRepository
                        .existsFaturaNotificacao(uid, cartao.getId(), inicioDoDia, fimDoDia);
                if (!jaNotificado) {
                    criarNotificacao(uid, empresaId, msg, TipoNotificacao.FATURA, cartao.getId());
                }
            }
        }
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private void criarNotificacao(Long uid, Long empresaId, String mensagem, TipoNotificacao tipo, Long referenciaId) {
        Usuario usuario = usuarioRepository.getReferenceById(uid);
        Notificacao n = new Notificacao();
        n.setMensagem(mensagem);
        n.setTipo(tipo);
        n.setReferenciaId(referenciaId);
        n.setUsuario(usuario);
        n.setLida(false);
        // empresa_id é NOT NULL; como rodamos fora do request scope (scheduler),
        // não há TenantContext disponível — definimos explicitamente a partir da entidade origem.
        if (empresaId != null) n.setEmpresaId(empresaId);
        notificacaoRepository.save(n);
    }
}
