package br.com.core4erp.chat.service;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Delimitação de conteúdo NÃO CONFIÁVEL enviado ao modelo (anexos do usuário e trechos recuperados
 * do RAG). O conteúdo é envolvido em tags explícitas e o system prompt instrui a IA a tratá-lo como
 * DADO, nunca como instrução (defesa contra prompt injection indireto).
 *
 * <p>Qualquer ocorrência de uma das tags DENTRO do conteúdo é neutralizada ({@code <} → {@code &lt;}),
 * de modo que um documento malicioso não consegue "fechar" o bloco e injetar texto fora dele.
 */
public final class ConteudoNaoConfiavel {

    public static final String TAG_DOCUMENTO = "documento_nao_confiavel";
    public static final String TAG_RAG = "material_referencia_nao_confiavel";

    /** Abertura ou fechamento de qualquer tag reservada, tolerando espaços e maiúsculas. */
    private static final Pattern TAG_RESERVADA = Pattern.compile(
            "<(\\s*/?\\s*(?:" + TAG_DOCUMENTO + "|" + TAG_RAG + "))",
            Pattern.CASE_INSENSITIVE);

    private ConteudoNaoConfiavel() {}

    /** Neutraliza as tags reservadas presentes no texto (impede escapar do bloco delimitado). */
    public static String neutralizarDelimitadores(String texto) {
        if (texto == null || texto.isEmpty()) {
            return "";
        }
        return TAG_RESERVADA.matcher(texto).replaceAll(m -> "&lt;" + Matcher.quoteReplacement(m.group(1)));
    }

    /** Envolve o conteúdo na tag informada, já neutralizado. */
    public static String envolver(String tag, String conteudo) {
        return "<" + tag + ">\n" + neutralizarDelimitadores(conteudo) + "\n</" + tag + ">";
    }
}
