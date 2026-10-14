package br.com.core4erp.config.security;

import org.slf4j.MDC;
import org.slf4j.Marker;
import org.slf4j.spi.LoggingEventBuilder;

import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import java.util.function.Supplier;

/**
 * Builder de evento de segurança que nunca gera par chave-valor duplicado.
 *
 * <p>O encoder ECS do Spring Boot DESCARTA o evento inteiro quando uma chave aparece duas vezes
 * (no MDC e no key-value, ou duas vezes no key-value). Para a trilha de SIEM isso é inaceitável,
 * então cada chave é resolvida assim:
 * <ul>
 *   <li>já existe no MDC com o mesmo valor → omitida (o MDC já carrega o dado);</li>
 *   <li>já existe no MDC com valor diferente (ex.: usuário AFETADO ≠ usuário que agiu) →
 *       gravada como {@code <chave>Alvo};</li>
 *   <li>já adicionada neste evento → a repetição é ignorada.</li>
 * </ul>
 */
final class EventoSegurancaBuilder implements LoggingEventBuilder {

    static final String SUFIXO_ALVO = "Alvo";

    private final LoggingEventBuilder delegate;
    private final Set<String> chaves = new HashSet<>();

    EventoSegurancaBuilder(LoggingEventBuilder delegate) {
        this.delegate = delegate;
    }

    @Override
    public LoggingEventBuilder addKeyValue(String chave, Object valor) {
        String chaveFinal = resolverChave(chave, valor);
        if (chaveFinal != null) {
            delegate.addKeyValue(chaveFinal, valor);
        }
        return this;
    }

    @Override
    public LoggingEventBuilder addKeyValue(String chave, Supplier<Object> valor) {
        return addKeyValue(chave, valor == null ? null : valor.get());
    }

    private String resolverChave(String chave, Object valor) {
        if (chave == null) return null;
        String noMdc = MDC.get(chave);
        String chaveFinal = chave;
        if (noMdc != null) {
            if (Objects.equals(noMdc, String.valueOf(valor))) return null;
            chaveFinal = chave + SUFIXO_ALVO;
        }
        if (MDC.get(chaveFinal) != null || !chaves.add(chaveFinal)) return null;
        return chaveFinal;
    }

    @Override
    public LoggingEventBuilder setCause(Throwable cause) {
        delegate.setCause(cause);
        return this;
    }

    @Override
    public LoggingEventBuilder addMarker(Marker marker) {
        delegate.addMarker(marker);
        return this;
    }

    @Override
    public LoggingEventBuilder addArgument(Object p) {
        delegate.addArgument(p);
        return this;
    }

    @Override
    public LoggingEventBuilder addArgument(Supplier<?> objectSupplier) {
        delegate.addArgument(objectSupplier);
        return this;
    }

    @Override
    public LoggingEventBuilder setMessage(String message) {
        delegate.setMessage(message);
        return this;
    }

    @Override
    public LoggingEventBuilder setMessage(Supplier<String> messageSupplier) {
        delegate.setMessage(messageSupplier);
        return this;
    }

    @Override
    public void log() {
        delegate.log();
    }

    @Override
    public void log(String message) {
        delegate.log(message);
    }

    @Override
    public void log(String message, Object arg) {
        delegate.log(message, arg);
    }

    @Override
    public void log(String message, Object arg0, Object arg1) {
        delegate.log(message, arg0, arg1);
    }

    @Override
    public void log(String message, Object... args) {
        delegate.log(message, args);
    }

    @Override
    public void log(Supplier<String> messageSupplier) {
        delegate.log(messageSupplier);
    }
}
