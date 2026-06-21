package br.com.core4erp.chat.config;

import io.micrometer.context.ContextRegistry;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Configuração do módulo de chat IA.
 *
 * <p>Registra um {@code ThreadLocalAccessor} para o SecurityContext no
 * {@link ContextRegistry} do Micrometer Context Propagation. Combinado com
 * {@code spring.reactor.context-propagation=auto}, isso faz o contexto de segurança
 * (capturado na thread que dispara o streaming) ser restaurado nas threads do Reactor
 * onde o Spring AI executa as tools. Sem isso, tools acionadas durante o streaming
 * (ex.: registrar conta) rodariam sem usuário/tenant, quebrando o isolamento multi-tenant.
 */
@Configuration
public class ChatAiConfig {

    static final String SECURITY_CONTEXT_KEY = "core4erp.security.context";

    @PostConstruct
    void registrarPropagacaoSecurityContext() {
        ContextRegistry.getInstance().registerThreadLocalAccessor(
                SECURITY_CONTEXT_KEY,
                SecurityContextHolder::getContext,
                SecurityContextHolder::setContext,
                SecurityContextHolder::clearContext);
    }
}
