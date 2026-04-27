package br.com.core4erp.categoria.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoriaRequestDto(
        @NotBlank(message = "Descrição é obrigatória")
        @Size(max = 100, message = "Descrição deve ter no máximo 100 caracteres")
        String descricao,

        @Size(max = 50) String icone
) {}
