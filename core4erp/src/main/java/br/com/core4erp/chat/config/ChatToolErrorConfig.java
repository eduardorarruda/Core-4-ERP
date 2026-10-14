package br.com.core4erp.chat.config;

import br.com.core4erp.chat.service.ConfirmacaoNecessariaException;
import br.com.core4erp.chat.service.ConteudoNaoConfiavel;
import br.com.core4erp.exception.AcessoNegadoException;
import br.com.core4erp.exception.BusinessException;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.tool.execution.ToolExecutionException;
import org.springframework.ai.tool.execution.ToolExecutionExceptionProcessor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.IllegalFormatException;
import java.util.regex.Pattern;

/**
 * Por padrão o Spring AI engole exceções de execução de tools e devolve o texto do erro
 * ao modelo, sem registrar nada — o que tornava falhas invisíveis no log.
 *
 * <p>Este processor registra o nome da tool e o stack trace completo da causa, e devolve
 * uma mensagem objetiva ao modelo. Essencial para diagnosticar falhas de tools em produção.
 *
 * <p>O texto da exceção só chega ao modelo quando é regra de negócio com mensagem amigável
 * ({@link #mensagemDeNegocio}); erro inesperado vira orientação genérica (nada de nome de
 * constraint, SQL ou classe Java, que o modelo repetiria ao usuário). Sempre com a instrução anti-loop.
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
            return mensagemDeFalha(tool, causa);
        };
    }

    // Anti-loop: sem esta instrução o modelo repetia a MESMA chamada dezenas de vezes
    // (visto em produção: ~25 chamadas/s de atualizarParceiro após um erro de validação).
    static final String ANTI_LOOP = " NÃO chame esta ferramenta novamente com os mesmos dados.";

    /** Teto do texto de erro de negócio repassado ao modelo (acima disso, provavelmente técnico). */
    static final int MAX_MENSAGEM_NEGOCIO = 300;

    /**
     * Marcadores de texto técnico (pacote Java, SQL, constraint, nome de exceção, parse do JDK) —
     * mensagem assim nunca vai ao modelo, que tenderia a repeti-la ao usuário.
     */
    private static final Pattern TEXTO_TECNICO = Pattern.compile(
            "(?i)(\\b(?:java|javax|jakarta|org|com|br)\\.[a-z_]+\\.|exception|constraint|\\bsql|hibernate|jdbc"
                    + "|for input string|no enum constant|\\bnull\\b|\\bat [a-z]+\\.)");

    static String mensagemDeFalha(String tool, Throwable causa) {
        if (causa instanceof DataIntegrityViolationException) {
            return "A ferramenta '" + tool + "' não concluiu: já existe um registro com esses dados ou ele"
                    + " está sendo usado em outro lugar." + ANTI_LOOP + " Explique isso ao usuário em"
                    + " linguagem simples e pergunte como ele deseja proceder.";
        }
        String negocio = mensagemDeNegocio(causa);
        if (negocio != null) {
            // A mensagem pode citar nomes digitados por usuários (ex.: "Há mais de uma categoria
            // chamada '...'") — vai envelopada como dado, fora das instruções.
            return "A ferramenta '" + tool + "' não concluiu. Motivo informado pelo sistema: "
                    + ConteudoNaoConfiavel.envolverDadosSistema(negocio) + "\n" + ANTI_LOOP.trim()
                    + " Explique o problema ao usuário em linguagem simples e pergunte como ele deseja proceder.";
        }
        // Falha inesperada (NPE, banco, serialização...): o texto técnico fica só no log.
        return "A ferramenta '" + tool + "' encontrou um erro interno inesperado." + ANTI_LOOP
                + " Não mostre detalhes técnicos: diga ao usuário, em linguagem simples, que não foi"
                + " possível concluir agora e sugira tentar novamente em instantes.";
    }

    /**
     * Mensagem amigável de regra de negócio, ou {@code null} se a exceção não for de domínio ou o
     * texto parecer técnico. Domínio = as mesmas exceções que o {@code GlobalExceptionHandler} já
     * expõe ao usuário na API REST ({@link BusinessException}, {@link EntityNotFoundException},
     * {@link IllegalArgumentException}/{@link IllegalStateException} lançadas pelos services com texto
     * pt-BR), exceto as variantes do JDK de texto técnico ({@link NumberFormatException},
     * {@link IllegalFormatException}).
     */
    static String mensagemDeNegocio(Throwable causa) {
        boolean dominio = causa instanceof BusinessException
                || causa instanceof EntityNotFoundException
                || (causa instanceof IllegalArgumentException
                        && !(causa instanceof NumberFormatException)
                        && !(causa instanceof IllegalFormatException))
                || causa instanceof IllegalStateException;
        if (!dominio) return null;
        String msg = causa.getMessage();
        if (msg == null || msg.isBlank() || msg.length() > MAX_MENSAGEM_NEGOCIO) return null;
        if (TEXTO_TECNICO.matcher(msg).find()) return null;
        return msg.strip();
    }
}
