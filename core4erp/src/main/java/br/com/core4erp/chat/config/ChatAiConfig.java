package br.com.core4erp.chat.config;

import br.com.core4erp.config.tenant.TenantContext;
import io.micrometer.context.ContextRegistry;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Configuração do módulo de chat IA.
 *
 * <p>Registra {@code ThreadLocalAccessor}s no {@link ContextRegistry} do Micrometer Context
 * Propagation. Combinado com {@code spring.reactor.context-propagation=auto}, faz os contextos
 * ligados à thread serem capturados na thread que dispara o streaming e restaurados nas threads
 * do Reactor ({@code boundedElastic}) onde o Spring AI executa as tools:
 *
 * <ul>
 *   <li><b>SecurityContext</b> — identidade do usuário autenticado.</li>
 *   <li><b>TenantContext</b> — empresa/permissões do tenant. Como o dispatch HTTP já encerrou
 *       quando as tools rodam no streaming, um escopo de requisição não serve (o request "não está
 *       mais ativo"). Por isso o TenantContext é {@link ThreadLocal} e propagado aqui — sem isso o
 *       {@code @Requer}/tenant lançava {@code ScopeNotActiveException} e quebrava as tools.</li>
 * </ul>
 */
@Configuration
public class ChatAiConfig {

    static final String SECURITY_CONTEXT_KEY = "core4erp.security.context";
    static final String TENANT_CONTEXT_KEY = "core4erp.tenant.context";

    @PostConstruct
    void registrarPropagacaoDeContexto() {
        ContextRegistry registry = ContextRegistry.getInstance();

        registry.registerThreadLocalAccessor(
                SECURITY_CONTEXT_KEY,
                SecurityContextHolder::getContext,
                SecurityContextHolder::setContext,
                SecurityContextHolder::clearContext);

        // Propaga o estado do tenant (empresa/permissões) às threads do Reactor onde as tools rodam.
        registry.registerThreadLocalAccessor(
                TENANT_CONTEXT_KEY,
                TenantContext::currentState,
                TenantContext::restoreState,
                TenantContext::removeState);
    }
}
