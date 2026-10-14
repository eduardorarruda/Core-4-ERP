package br.com.core4erp.chat.dto;

import br.com.core4erp.chat.entity.ChatMensagem;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatRequestDto(
        @NotBlank(message = "Mensagem é obrigatória")
        @Size(max = 4000, message = "Mensagem deve ter no máximo 4000 caracteres")
        String mensagem,

        /** Superfície da conversa: ASSISTENTE (tela) ou BALAO (balão flutuante). Opcional. */
        String canal,

        /** Conversa (thread) alvo. Opcional — se ausente, o backend resolve/cria a conversa ativa. */
        Long conversaId
) {
    /** Compatibilidade: mensagem sem canal/conversa cai na tela do Assistente. */
    public ChatRequestDto(String mensagem) {
        this(mensagem, null, null);
    }

    public ChatRequestDto(String mensagem, String canal) {
        this(mensagem, canal, null);
    }

    /** Canal resolvido (default ASSISTENTE; valor desconhecido também cai no default). */
    public ChatMensagem.Canal canalResolvido() {
        if (canal == null || canal.isBlank()) return ChatMensagem.Canal.ASSISTENTE;
        try {
            return ChatMensagem.Canal.valueOf(canal.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return ChatMensagem.Canal.ASSISTENTE;
        }
    }
}
