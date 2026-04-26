package br.com.core4erp.contaCorrente.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record ContaCorrenteRequestDto(
        @NotBlank(message = "Número da conta é obrigatório")
        @Size(max = 20)
        String numeroConta,

        @NotBlank(message = "Agência é obrigatória")
        @Size(max = 10)
        String agencia,

        @NotBlank(message = "Descrição é obrigatória")
        @Size(max = 150)
        String descricao,

        @NotNull(message = "Saldo inicial é obrigatório")
        @PositiveOrZero(message = "Saldo não pode ser negativo")
        BigDecimal saldo
) {}
