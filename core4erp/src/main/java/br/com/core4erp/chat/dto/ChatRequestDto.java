package br.com.core4erp.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChatRequestDto(
        @NotBlank(message = "Mensagem é obrigatória")
        @Size(max = 4000, message = "Mensagem deve ter no máximo 4000 caracteres")
        String mensagem
) {}
