package br.com.core4erp.contaCorrente.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record ContaCorrenteRequestDto(
        @NotBlank(message = "Apelido é obrigatório")
        String apelido,

        @NotBlank(message = "Descrição é obrigatória")
        String descricao,

        @NotNull(message = "Saldo é obrigatório")
        @PositiveOrZero(message = "Saldo não pode ser negativo")
        BigDecimal saldo
) {}
