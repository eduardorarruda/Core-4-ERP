package br.com.core4erp.chat.service;

import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Sanitização de entrada do chat.
 *
 * <p>A defesa real contra uso indevido de tools não é um blocklist de frases (trivialmente
 * contornável por tradução/encoding e que degrada a UX), e sim a autorização na camada de
 * serviço: toda tool de escrita passa pelos serviços de domínio, que filtram pelo usuário
 * autenticado ({@code SecurityContextUtils}). Aqui limitamos o tamanho da entrada (custo de tokens
 * e payloads abusivos), removemos caracteres de controle e neutralizamos os delimitadores de
 * conteúdo não confiável ({@link ConteudoNaoConfiavel}).
 */
@Component
public class ChatInputSanitizer {

    /** Teto da mensagem digitada pelo usuário. */
    public static final int MAX_CHARS = 4000;

    /** Controles C0/C1 exceto TAB, LF e CR (mantidos para preservar a estrutura de planilhas/extratos). */
    private static final Pattern CONTROLES = Pattern.compile("[\\p{Cc}&&[^\\t\\n\\r]]");

    public String sanitize(String input) {
        return sanitize(input, MAX_CHARS);
    }

    /** Sanitiza com um teto de caracteres explícito (ex.: prompt montado para um anexo). */
    public String sanitize(String input, int maxChars) {
        if (input == null) {
            return "";
        }
        String limpo = ConteudoNaoConfiavel.neutralizarDelimitadores(
                CONTROLES.matcher(input).replaceAll("")).strip();
        int teto = Math.max(1, maxChars);
        return limpo.length() > teto ? limpo.substring(0, teto) : limpo;
    }

    /**
     * Prompt montado pelo servidor (anexo) cujas partes variáveis JÁ passaram por {@link #sanitize}
     * e {@link #envolverDocumento}: remove controles e aplica o teto, mas NÃO neutraliza as tags de
     * delimitação — elas foram inseridas pelo próprio servidor.
     */
    public String limitarPromptMontado(String prompt, int maxChars) {
        if (prompt == null) {
            return "";
        }
        String limpo = CONTROLES.matcher(prompt).replaceAll("").strip();
        int teto = Math.max(1, maxChars);
        return limpo.length() > teto ? limpo.substring(0, teto) : limpo;
    }

    /**
     * Prepara conteúdo NÃO CONFIÁVEL (texto extraído de anexo) para o modelo: remove controles,
     * aplica o teto e envolve em {@code <documento_nao_confiavel>} com os delimitadores internos
     * neutralizados.
     */
    public String envolverDocumento(String conteudo, int maxChars) {
        return ConteudoNaoConfiavel.envolver(ConteudoNaoConfiavel.TAG_DOCUMENTO, sanitize(conteudo, maxChars));
    }
}
