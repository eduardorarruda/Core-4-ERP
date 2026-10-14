package br.com.core4erp.config.observabilidade;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.filter.Filter;
import ch.qos.logback.core.spi.FilterReply;

import java.util.Locale;

/**
 * Filtro do Logback que habilita um appender somente quando o formato de log ativo
 * ({@code app.log.format}: {@code json} ou {@code texto}) é o formato daquele appender.
 *
 * <p>Permite escolher entre JSON estruturado e texto legível por variável de ambiente
 * ({@code LOG_FORMAT}) sem depender de Janino/condicionais no {@code logback-spring.xml}.
 * A decisão é calculada uma única vez no {@link #start()} — custo zero por evento.
 */
public class FiltroFormatoLog extends Filter<ILoggingEvent> {

    static final String FORMATO_JSON = "json";
    static final String FORMATO_TEXTO = "texto";

    private String formatoAtivo = FORMATO_TEXTO;
    private String formatoDoAppender = FORMATO_TEXTO;
    private boolean habilitado = true;

    public void setFormatoAtivo(String formatoAtivo) {
        this.formatoAtivo = formatoAtivo;
    }

    public void setFormatoDoAppender(String formatoDoAppender) {
        this.formatoDoAppender = formatoDoAppender;
    }

    @Override
    public void start() {
        habilitado = normalizar(formatoAtivo).equals(normalizar(formatoDoAppender));
        super.start();
    }

    @Override
    public FilterReply decide(ILoggingEvent event) {
        return habilitado ? FilterReply.NEUTRAL : FilterReply.DENY;
    }

    /** Qualquer valor diferente de "json" (inclusive vazio/inválido) cai no formato texto. */
    static String normalizar(String formato) {
        if (formato == null) {
            return FORMATO_TEXTO;
        }
        String f = formato.strip().toLowerCase(Locale.ROOT);
        return FORMATO_JSON.equals(f) || "ecs".equals(f) ? FORMATO_JSON : FORMATO_TEXTO;
    }
}
