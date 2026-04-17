package br.com.core4erp.conta.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BaixaRequestDto(
        @NotNull(message = "Conta corrente é obrigatória")
        Long contaCorrenteId,

        @NotNull(message = "Data de pagamento é obrigatória")
        LocalDate dataPagamento,

        @PositiveOrZero BigDecimal juros,
        @PositiveOrZero BigDecimal multa,
        @PositiveOrZero BigDecimal acrescimo,
        @PositiveOrZero BigDecimal desconto
) {}
