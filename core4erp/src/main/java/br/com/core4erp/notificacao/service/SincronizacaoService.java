package br.com.core4erp.notificacao.service;

import br.com.core4erp.cartaoCredito.entity.CartaoCredito;
import br.com.core4erp.cartaoCredito.repository.CartaoCreditoRepository;
import br.com.core4erp.cartaoCredito.service.CartaoCreditoService;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.repository.ContaRepository;
import br.com.core4erp.empresa.repository.EmpresaRepository;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.TipoNotificacao;
import br.com.core4erp.notificacao.entity.Notificacao;
import br.com.core4erp.notificacao.repository.NotificacaoRepository;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
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

    public SincronizacaoService(UsuarioRepository usuarioRepository,
                                ContaRepository contaRepository,
                                CartaoCreditoRepository cartaoRepository,
                                CartaoCreditoService cartaoCreditoService,
                                NotificacaoRepository notificacaoRepository,
                                EmpresaRepository empresaRepository) {
        this.usuarioRepository = usuarioRepository;
        this.contaRepository = contaRepository;
        this.cartaoRepository = cartaoRepository;
        this.cartaoCreditoService = cartaoCreditoService;
        this.notificacaoRepository = notificacaoRepository;
        this.empresaRepository = empresaRepository;
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

    /** Sincroniza todas as empresas (chamada administrativa). */
    @Transactional
    public void sincronizarTodos() {
        empresaRepository.findIdsAtivas().forEach(this::sincronizar);
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

        for (Conta conta : vencidas) {
            Long uid = conta.getUsuario().getId();
            boolean jaNotificado = notificacaoRepository
                    .existsByUsuarioIdAndTipoAndReferenciaId(uid, TipoNotificacao.VENCIMENTO, conta.getId());
            if (!jaNotificado) {
                criarNotificacao(uid, conta.getEmpresaId(),
                        "Conta vencida: " + conta.getDescricao() + " (vencimento: " + conta.getDataVencimento() + ")",
                        TipoNotificacao.VENCIMENTO, conta.getId());
            }
        }
    }

    // ── Regra 2 ──────────────────────────────────────────────────────────────

    private void sincronizarFaturasCartao(Long empresaId) {
        int diaHoje = LocalDate.now().getDayOfMonth();
        List<CartaoCredito> cartoes = cartaoRepository.findAllByEmpresaId(empresaId);

        for (CartaoCredito cartao : cartoes) {
            if (!cartao.getDiaFechamento().equals(diaHoje)) continue;

            Long uid = cartao.getUsuario().getId();
            YearMonth mesAtual = YearMonth.now();
            LocalDateTime inicioDoDia = LocalDate.now().atStartOfDay();
            LocalDateTime fimDoDia = LocalDate.now().atTime(23, 59, 59);

            boolean jaNotificado = notificacaoRepository
                    .existsFaturaNotificacao(uid, cartao.getId(), inicioDoDia, fimDoDia);

            if (!jaNotificado) {
                criarNotificacao(uid, cartao.getEmpresaId(),
                        "Fatura do cartão " + cartao.getNome() + " fecha hoje (" +
                        String.format("%02d/%d", mesAtual.getMonthValue(), mesAtual.getYear()) + ")",
                        TipoNotificacao.FATURA, cartao.getId());
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
