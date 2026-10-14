package br.com.core4erp.chat.config;

import org.springframework.ai.tool.execution.ToolExecutionException;

/** Acesso de teste ao processor de erros de tools (bean package-private). */
public final class ChatToolErrorConfigTestAccess {

    private ChatToolErrorConfigTestAccess() {}

    public static String processar(ToolExecutionException e) {
        return new ChatToolErrorConfig().toolExecutionExceptionProcessor().process(e);
    }
}
