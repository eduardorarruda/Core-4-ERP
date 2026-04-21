package br.com.core4erp.cartaoCredito.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record CartaoCreditoRequestDto(
        @NotBlank(message = "Nome é obrigatório")
        String nome,

        @NotNull(message = "Limite é obrigatório")
        @Positive(message = "Limite deve ser positivo")
        BigDecimal limite,

        @NotNull(message = "Dia de fechamento é obrigatório")
        @Min(1) @Max(31)
        Integer diaFechamento,

        @NotNull(message = "Dia de vencimento é obrigatório")
        @Min(1) @Max(31)
        Integer diaVencimento,

        @NotNull(message = "Conta corrente é obrigatória")
        Long contaCorrenteId
) {}
