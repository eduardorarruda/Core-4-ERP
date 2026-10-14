package br.com.core4erp.chat.config;

import br.com.core4erp.chat.service.ConfirmacaoNecessariaException;
import br.com.core4erp.exception.AcessoNegadoException;
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
            // Não é falha: portão de escrita em turno com anexo (GateEscritaAnexoAspect) ou de ação
            // crítica não confirmada (GateAcaoCriticaAspect) — devolve a instrução de confirmação ao
            // modelo, sem stack trace no log.
            if (causa instanceof ConfirmacaoNecessariaException confirmacao) {
                return confirmacao.getMessage();
            }
            // Falta de permissão não é falha técnica: o PermissaoAspect já registrou o evento de
            // segurança. A mensagem da exceção traz o código interno (ex.: CONTA_DELETAR), que
            // nunca deve chegar ao usuário — o modelo recebe só a orientação em linguagem simples.
            if (causa instanceof AcessoNegadoException) {
                log.warn("[CHAT-TOOL-SEM-PERMISSAO] tool={}", tool);
                return "O usuário não tem permissão para esta ação ('" + tool + "'). NÃO tente de novo"
                        + " nem por outra ferramenta. Explique em linguagem simples que ele não tem acesso"
                        + " a essa funcionalidade e que pode pedir a liberação ao administrador da empresa.";
            }
            log.error("[CHAT-TOOL-ERRO] tool={} causa={}: {}",
                    tool, causa.getClass().getName(), causa.getMessage(), causa);
            // Anti-loop: sem esta instrução o modelo repetia a MESMA chamada dezenas de vezes
            // (visto em produção: ~25 chamadas/s de atualizarParceiro após um erro de validação).
            return "A ferramenta '" + tool + "' falhou: " + causa.getMessage()
                    + " — NÃO chame esta ferramenta novamente com os mesmos dados. Explique o problema"
                    + " ao usuário em linguagem simples e pergunte como ele deseja proceder.";
        };
    }
}
