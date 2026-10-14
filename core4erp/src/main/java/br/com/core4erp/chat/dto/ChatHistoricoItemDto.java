package br.com.core4erp.chat.dto;

/**
 * Uma mensagem da conversa, para o frontend exibir o histórico. role = "user" | "assistant".
 *
 * @param falha {@code true} quando a mensagem do assistente é o marcador de "não consegui responder"
 *   gravado após uma falha da IA (ver {@code RespostaFalhaChat}) — o front pode destacá-la.
 */
public record ChatHistoricoItemDto(String role, String texto, boolean falha) {

    /** Mensagem normal (não é marcador de falha). */
    public ChatHistoricoItemDto(String role, String texto) {
        this(role, texto, false);
    }
}
