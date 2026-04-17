package br.com.core4erp.cartaoCredito.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record FechamentoFaturaRequestDto(
        @NotNull(message = "Mês é obrigatório")
        @Min(1) @Max(12)
        Integer mes,

        @NotNull(message = "Ano é obrigatório")
        Integer ano
) {}
