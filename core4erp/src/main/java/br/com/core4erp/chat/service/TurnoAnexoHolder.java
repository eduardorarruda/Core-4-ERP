package br.com.core4erp.chat.service;

/**
 * Marca a thread corrente como processando um turno do chat que contém um ANEXO (arquivo enviado
 * pelo usuário). O conteúdo de anexos é não confiável (pode trazer instruções maliciosas — prompt
 * injection indireto), por isso, neste turno, as ferramentas de ESCRITA ficam bloqueadas pelo
 * {@link GateEscritaAnexoAspect}: a IA só pode propor as ações e pedir confirmação; a execução
 * acontece no turno seguinte, depois que o usuário confirmar.
 *
 * <p>Setado/limpo pelo {@link ChatAnexoService}; propagado às threads do Reactor pelo accessor
 * registrado em {@code ChatAiConfig} (mesmo padrão de {@link OrigemIaHolder}).
 */
public final class TurnoAnexoHolder {

    private static final ThreadLocal<Boolean> TURNO_COM_ANEXO = new ThreadLocal<>();

    private TurnoAnexoHolder() {}

    public static void marcar() {
        TURNO_COM_ANEXO.set(Boolean.TRUE);
    }

    public static boolean isTurnoComAnexo() {
        return Boolean.TRUE.equals(TURNO_COM_ANEXO.get());
    }

    public static void limpar() {
        TURNO_COM_ANEXO.remove();
    }

    // ── Suporte à propagação de contexto (Micrometer ThreadLocalAccessor) ──────

    public static Boolean currentState() {
        return TURNO_COM_ANEXO.get();
    }

    public static void restoreState(Boolean state) {
        if (state != null) TURNO_COM_ANEXO.set(state); else TURNO_COM_ANEXO.remove();
    }

    public static void removeState() {
        TURNO_COM_ANEXO.remove();
    }
}
