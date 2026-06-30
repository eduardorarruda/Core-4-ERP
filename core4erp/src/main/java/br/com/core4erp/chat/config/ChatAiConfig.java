package br.com.core4erp.chat.config;

import io.micrometer.context.ContextRegistry;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;

/**
 * Configuração do módulo de chat IA.
 *
 * <p>Registra {@code ThreadLocalAccessor}s no {@link ContextRegistry} do Micrometer Context
 * Propagation. Combinado com {@code spring.reactor.context-propagation=auto}, faz os contextos
 * capturados na thread que dispara o streaming serem restaurados nas threads do Reactor
 * ({@code boundedElastic}) onde o Spring AI executa as tools:
 *
 * <ul>
 *   <li><b>SecurityContext</b> — identidade do usuário autenticado.</li>
 *   <li><b>RequestAttributes</b> — escopo de requisição. Sem ele, o {@code TenantContext}
 *       ({@code @Scope("request")}) e o {@code PermissaoAspect} (@Requer) lançam
 *       {@code ScopeNotActiveException: Scope 'request' is not active} nas threads do Reactor,
 *       quebrando QUALQUER tool que dependa do tenant (registrar categoria/parceiro/conta...).</li>
 * </ul>
 */
@Configuration
public class ChatAiConfig {

    static final String SECURITY_CONTEXT_KEY = "core4erp.security.context";
    static final String REQUEST_ATTRIBUTES_KEY = "core4erp.request.attributes";

    @PostConstruct
    void registrarPropagacaoDeContexto() {
        ContextRegistry registry = ContextRegistry.getInstance();

        registry.registerThreadLocalAccessor(
                SECURITY_CONTEXT_KEY,
                SecurityContextHolder::getContext,
                SecurityContextHolder::setContext,
                SecurityContextHolder::clearContext);

        // Propaga o escopo de requisição às threads do Reactor — habilita o TenantContext
        // request-scoped e o @Requer dentro das tools do chat durante o streaming.
        registry.registerThreadLocalAccessor(
                REQUEST_ATTRIBUTES_KEY,
                RequestContextHolder::getRequestAttributes,
                ra -> RequestContextHolder.setRequestAttributes(ra),
                RequestContextHolder::resetRequestAttributes);
    }
}
