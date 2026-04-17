package br.com.core4erp.notificacao.service;

import br.com.core4erp.cartaoCredito.entity.CartaoCredito;
import br.com.core4erp.cartaoCredito.repository.CartaoCreditoRepository;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.repository.ContaRepository;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.TipoNotificacao;
import br.com.core4erp.notificacao.entity.Notificacao;
import br.com.core4erp.notificacao.repository.NotificacaoRepository;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
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
    private final NotificacaoRepository notificacaoRepository;

    public SincronizacaoService(UsuarioRepository usuarioRepository,
                                ContaRepository contaRepository,
                                CartaoCreditoRepository cartaoRepository,
                                NotificacaoRepository notificacaoRepository) {
        this.usuarioRepository = usuarioRepository;
        this.contaRepository = contaRepository;
        this.cartaoRepository = cartaoRepository;
        this.notificacaoRepository = notificacaoRepository;
    }

    /**
     * Regra 1: Contas PENDENTE com data de vencimento < hoje → marcar ATRASADO + notificação.
     * Regra 2: Cartões com dia_fechamento = hoje → notificação de FATURA.
     * Idempotente: não duplica notificações.
     */
    @Transactional
    public void sincronizar(Long usuarioId) {
        sincronizarContasVencidas(usuarioId);
        sincronizarFaturasCartao(usuarioId);
    }

    /** Sincroniza todos os usuários (chamada administrativa). */
    @Transactional
    public void sincronizarTodos() {
        usuarioRepository.findAll().forEach(u -> sincronizar(u.getId()));
    }

    // ── Regra 1 ──────────────────────────────────────────────────────────────

    private void sincronizarContasVencidas(Long uid) {
        List<Conta> vencidas = contaRepository
                .findByUsuarioIdAndStatusAndDataVencimentoBefore(uid, StatusConta.PENDENTE, LocalDate.now());

        vencidas.forEach(c -> c.setStatus(StatusConta.ATRASADO));
        contaRepository.saveAll(vencidas);

        for (Conta conta : vencidas) {
            boolean jaNotificado = notificacaoRepository
                    .existsByUsuarioIdAndTipoAndReferenciaId(uid, TipoNotificacao.VENCIMENTO, conta.getId());
            if (!jaNotificado) {
                criarNotificacao(uid,
                        "Conta vencida: " + conta.getDescricao() + " (vencimento: " + conta.getDataVencimento() + ")",
                        TipoNotificacao.VENCIMENTO, conta.getId());
            }
        }
    }

    // ── Regra 2 ──────────────────────────────────────────────────────────────

    private void sincronizarFaturasCartao(Long uid) {
        int diaHoje = LocalDate.now().getDayOfMonth();
        List<CartaoCredito> cartoes = cartaoRepository.findAllByUsuarioId(uid);

        for (CartaoCredito cartao : cartoes) {
            if (!cartao.getDiaFechamento().equals(diaHoje)) continue;

            YearMonth mesAtual = YearMonth.now();
            LocalDateTime inicioDoDia = LocalDate.now().atStartOfDay();
            LocalDateTime fimDoDia = LocalDate.now().atTime(23, 59, 59);

            boolean jaNotificado = notificacaoRepository
                    .existsFaturaNotificacao(uid, cartao.getId(), inicioDoDia, fimDoDia);

            if (!jaNotificado) {
                criarNotificacao(uid,
                        "Fatura do cartão " + cartao.getNome() + " fecha hoje (" +
                        String.format("%02d/%d", mesAtual.getMonthValue(), mesAtual.getYear()) + ")",
                        TipoNotificacao.FATURA, cartao.getId());
            }
        }
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private void criarNotificacao(Long uid, String mensagem, TipoNotificacao tipo, Long referenciaId) {
        Usuario usuario = usuarioRepository.getReferenceById(uid);
        Notificacao n = new Notificacao();
        n.setMensagem(mensagem);
        n.setTipo(tipo);
        n.setReferenciaId(referenciaId);
        n.setUsuario(usuario);
        n.setLida(false);
        notificacaoRepository.save(n);
    }
}
