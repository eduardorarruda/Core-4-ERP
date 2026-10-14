package br.com.core4erp.chat.service;

/**
 * Identifica o TURNO do chat (uma mensagem do usuário) que a thread corrente está processando:
 * conversa, usuário, número sequencial do turno na conversa e se a mensagem do usuário é uma
 * confirmação explícita ("sim", "confirmo"...). Lido pelo {@link GateAcaoCriticaAspect} para decidir
 * se uma ação crítica pode executar.
 *
 * <p>Setado/limpo pelo {@link ChatService} (pipeline interno, síncrono e streaming); propagado às
 * threads do Reactor pelo accessor registrado em {@code ChatAiConfig} (mesmo padrão de
 * {@link TurnoAnexoHolder}). Ausente = chamada fora de um turno do chat (ex.: MCP) — o gate bloqueia
 * ações críticas (fail-safe).
 */
public final class TurnoChatHolder {

    /** Snapshot imutável do turno (seguro para propagar entre threads). */
    public record Turno(Long conversaId, Long usuarioId, long numero, boolean confirmacaoExplicita) {}

    private static final ThreadLocal<Turno> TURNO = new ThreadLocal<>();

    private TurnoChatHolder() {}

    public static void definir(Turno turno) {
        TURNO.set(turno);
    }

    public static Turno atual() {
        return TURNO.get();
    }

    public static void limpar() {
        TURNO.remove();
    }

    // ── Suporte à propagação de contexto (Micrometer ThreadLocalAccessor) ──────

    public static Turno currentState() {
        return TURNO.get();
    }

    public static void restoreState(Turno state) {
        if (state != null) TURNO.set(state); else TURNO.remove();
    }

    public static void removeState() {
        TURNO.remove();
    }
}
