package br.com.core4erp.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Pedido para renomear uma conversa. */
public record RenomearConversaDto(
        @NotBlank(message = "Título é obrigatório")
        @Size(max = 120, message = "Título deve ter no máximo 120 caracteres")
        String titulo
) {}
