package br.com.core4erp.chat.service;

import java.util.Set;

/**
 * Marcador de "a IA não conseguiu responder" persistido no histórico da conversa.
 *
 * <p>Quando a chamada ao modelo falha (OpenAI fora, timeout, 429, erro no stream), gravamos uma
 * mensagem ASSISTANT com um destes textos fixos — assim, ao reabrir a conversa, a pergunta não fica
 * "sem resposta". Sem coluna nova (a CHECK de {@code tb_chat_mensagem.role} só aceita USER/ASSISTANT):
 * o marcador é reconhecido pelo texto exato. Só o servidor grava mensagens ASSISTANT, então o usuário
 * não consegue forjar o marcador.
 *
 * <ul>
 *   <li>{@link ChatMemoryService#carregarContexto} descarta o marcador — ele não vai como contexto
 *       para o modelo (não é resposta real).</li>
 *   <li>{@code GET /api/chat/conversas/{id}/mensagens} devolve {@code falha=true} para o front
 *       poder destacar a mensagem / oferecer "tentar de novo".</li>
 * </ul>
 */
public final class RespostaFalhaChat {

    /** Falha genérica (OpenAI indisponível, timeout, erro de stream, erro interno). */
    public static final String TEXTO_PADRAO = "Não consegui responder agora. Tente novamente.";

    /** Limite de requisições/tokens da OpenAI (429). */
    public static final String TEXTO_LIMITE =
            "O assistente recebeu muitas solicitações em pouco tempo. Aguarde alguns segundos e tente novamente.";

    /** Teto ao percorrer a cadeia de causas (proteção contra ciclos). */
    private static final int MAX_NIVEIS_CAUSA = 10;

    private static final Set<String> MARCADORES = Set.of(TEXTO_PADRAO, TEXTO_LIMITE);

    private RespostaFalhaChat() {}

    /** Texto amigável para a falha — nunca a mensagem técnica da exceção. */
    public static String textoPara(Throwable erro) {
        return ehLimiteDeRequisicoes(erro) ? TEXTO_LIMITE : TEXTO_PADRAO;
    }

    /** {@code true} se o conteúdo persistido é o marcador de falha (e não uma resposta real). */
    public static boolean ehMarcador(String conteudo) {
        return conteudo != null && MARCADORES.contains(conteudo.strip());
    }

    private static boolean ehLimiteDeRequisicoes(Throwable erro) {
        Throwable t = erro;
        for (int nivel = 0; t != null && nivel < MAX_NIVEIS_CAUSA; nivel++, t = t.getCause()) {
            String m = t.getMessage();
            if (m != null && (m.contains("429") || m.contains("rate_limit") || m.contains("Rate limit"))) {
                return true;
            }
        }
        return false;
    }
}
