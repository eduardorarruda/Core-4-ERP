package br.com.core4erp.chat.dto;

import br.com.core4erp.chat.entity.ChatConversa;

import java.time.LocalDateTime;

/** Item da lista de conversas (barra lateral estilo ChatGPT). */
public record ChatConversaResponseDto(
        Long id,
        String titulo,
        String canal,
        LocalDateTime atualizadoEm
) {
    public static ChatConversaResponseDto from(ChatConversa c) {
        return new ChatConversaResponseDto(c.getId(), c.getTitulo(), c.getCanal().name(), c.getAtualizadoEm());
    }
}
