package br.com.core4erp.chat.config;

import io.micrometer.context.ContextRegistry;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

import reactor.core.publisher.Hooks;

/**
 * Habilita a propagação automática de ThreadLocals para as threads do Reactor.
 *
 * <p>O streaming do chat ({@code ChatService.processarStream}) executa as tools em threads
 * do Reactor (via {@code .stream()...subscribe()}), fora da thread da requisição HTTP.
 * Sem isto, o {@link SecurityContextHolder} (ThreadLocal) e o escopo de requisição
 * ({@code @RequestScope SecurityContextUtils}) ficam indisponíveis nessas threads, fazendo
 * as tools que dependem do usuário/tenant falharem ou quebrarem o isolamento multi-tenant.
 *
 * <p>Registramos accessors para o contexto de segurança e para os atributos de requisição;
 * o Reactor captura esses valores no momento da subscrição (na thread da requisição, onde
 * estão preenchidos) e os restaura ao redor de cada operador — incluindo a execução das tools.
 */
@Configuration
public class ReactorContextPropagationConfig {

    static final String SECURITY_CONTEXT_KEY = "core4erp.security.context";
    static final String REQUEST_ATTRIBUTES_KEY = "core4erp.request.attributes";

    @PostConstruct
    void init() {
        Hooks.enableAutomaticContextPropagation();

        ContextRegistry registry = ContextRegistry.getInstance();

        registry.registerThreadLocalAccessor(
                SECURITY_CONTEXT_KEY,
                SecurityContextHolder::getContext,
                SecurityContextHolder::setContext,
                SecurityContextHolder::clearContext);

        registry.registerThreadLocalAccessor(
                REQUEST_ATTRIBUTES_KEY,
                RequestContextHolder::getRequestAttributes,
                (RequestAttributes attrs) -> RequestContextHolder.setRequestAttributes(attrs, true),
                RequestContextHolder::resetRequestAttributes);
    }
}
