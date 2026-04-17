package br.com.core4erp.cartaoCredito.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LancamentoRequestDto(
        @NotBlank(message = "Descrição é obrigatória")
        String descricao,

        @NotNull(message = "Valor é obrigatório")
        @Positive(message = "Valor deve ser positivo")
        BigDecimal valor,

        @NotNull(message = "Data da compra é obrigatória")
        LocalDate dataCompra,

        @NotNull(message = "Mês da fatura é obrigatório")
        @Min(1) @Max(12)
        Integer mesFatura,

        @NotNull(message = "Ano da fatura é obrigatório")
        Integer anoFatura,

        @NotNull(message = "Categoria é obrigatória")
        Long categoriaId,

        /** Número de parcelas (>= 1). */
        @PositiveOrZero
        Integer quantidadeParcelas,

        /** true = divide o valor; false = repete em cada parcela. */
        Boolean dividirValor
) {}
