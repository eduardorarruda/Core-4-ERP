package br.com.core4erp.chat.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.execution.ToolExecutionException;
import org.springframework.ai.tool.execution.ToolExecutionExceptionProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Por padrão o Spring AI engole exceções de execução de tools e devolve o texto do erro
 * ao modelo, sem registrar nada — o que tornava falhas invisíveis no log.
 *
 * <p>Este processor registra o nome da tool e o stack trace completo da causa, e devolve
 * uma mensagem objetiva ao modelo. Essencial para diagnosticar falhas de tools em produção.
 */
@Configuration
public class ChatToolErrorConfig {

    private static final Logger log = LoggerFactory.getLogger(ChatToolErrorConfig.class);

    @Bean
    ToolExecutionExceptionProcessor toolExecutionExceptionProcessor() {
        return (ToolExecutionException ex) -> {
            String tool = ex.getToolDefinition() != null ? ex.getToolDefinition().name() : "desconhecida";
            Throwable causa = ex.getCause() != null ? ex.getCause() : ex;
            log.error("[CHAT-TOOL-ERRO] tool={} causa={}: {}",
                    tool, causa.getClass().getName(), causa.getMessage(), causa);
            return "A ferramenta '" + tool + "' falhou: " + causa.getMessage();
        };
    }
}
