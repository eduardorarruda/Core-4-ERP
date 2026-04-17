package br.com.core4erp.categoria.dto;

import jakarta.validation.constraints.NotBlank;

public record CategoriaRequestDto(
        @NotBlank(message = "Descrição é obrigatória")
        String descricao
) {}
