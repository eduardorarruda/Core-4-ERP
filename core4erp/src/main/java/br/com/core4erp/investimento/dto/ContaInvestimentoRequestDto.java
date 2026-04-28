package br.com.core4erp.investimento.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ContaInvestimentoRequestDto(
        @NotBlank(message = "Nome é obrigatório")
        String nome,

        @NotNull(message = "Tipo é obrigatório")
        Long tipoId
) {}
