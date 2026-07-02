package br.com.core4erp.chat.service;

/**
 * Marca a thread corrente como "executando uma ação da IA" (a pedido do usuário autenticado).
 *
 * <p>Setado pelo {@link ChatService} no início do processamento (síncrono e streaming) e propagado
 * às threads do Reactor onde as tools rodam (accessor registrado em {@code ChatAiConfig}). Lido pela
 * auditoria ({@code AuditoriaService}) para gravar {@code is_ai_action=true} — assim a tela de
 * auditoria exibe "Ação executada pela IA a pedido do utilizador X".
 */
public final class OrigemIaHolder {

    private static final ThreadLocal<Boolean> ORIGEM_IA = new ThreadLocal<>();

    private OrigemIaHolder() {}

    public static void marcarIa() {
        ORIGEM_IA.set(Boolean.TRUE);
    }

    public static boolean isIa() {
        return Boolean.TRUE.equals(ORIGEM_IA.get());
    }

    public static void limpar() {
        ORIGEM_IA.remove();
    }

    // ── Suporte à propagação de contexto (Micrometer ThreadLocalAccessor) ──────

    public static Boolean currentState() {
        return ORIGEM_IA.get();
    }

    public static void restoreState(Boolean state) {
        if (state != null) ORIGEM_IA.set(state); else ORIGEM_IA.remove();
    }

    public static void removeState() {
        ORIGEM_IA.remove();
    }
}
