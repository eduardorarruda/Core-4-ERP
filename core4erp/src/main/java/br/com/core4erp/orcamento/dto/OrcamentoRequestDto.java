package br.com.core4erp.orcamento.dto;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

/** Criação/alteração de um orçamento mensal (limite recorrente) para uma categoria principal. */
public record OrcamentoRequestDto(
        @NotNull(message = "Escolha a categoria do orçamento.")
        Long categoriaId,

        @NotNull(message = "Informe o limite mensal.")
        @Positive(message = "O limite mensal precisa ser maior que zero.")
        @Digits(integer = 13, fraction = 2, message = "Informe um limite válido, com até 2 casas decimais.")
        BigDecimal valorLimite
) {}
