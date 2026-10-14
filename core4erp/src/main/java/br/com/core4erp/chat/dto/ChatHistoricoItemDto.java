package br.com.core4erp.chat.dto;

/** Uma mensagem da conversa atual, para o frontend exibir o histórico. role = "user" | "assistant". */
public record ChatHistoricoItemDto(String role, String texto) {}
