package br.com.core4erp.contaCorrente.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record TransferenciaRequestDto(
        @NotNull(message = "Conta origem é obrigatória")
        Long contaOrigemId,

        @NotNull(message = "Conta destino é obrigatória")
        Long contaDestinoId,

        @NotNull(message = "Valor é obrigatório")
        @Positive(message = "Valor deve ser positivo")
        BigDecimal valor
) {}
