package br.com.core4erp.conta.dto;

import br.com.core4erp.enums.TipoConta;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContaCreateDto(
        @NotBlank(message = "Descrição é obrigatória")
        String descricao,

        @NotNull(message = "Valor é obrigatório")
        @Positive(message = "Valor deve ser positivo")
        BigDecimal valorOriginal,

        @NotNull(message = "Data de vencimento é obrigatória")
        LocalDate dataVencimento,

        @NotNull(message = "Tipo é obrigatório")
        TipoConta tipo,

        @NotNull(message = "Categoria é obrigatória")
        Long categoriaId,

        Long parceiroId,

        /** Número de parcelas (>=1). Se >1, gera lote com grupoParcelamento. */
        @PositiveOrZero
        Integer quantidadeParcelas,

        /** Intervalo em meses entre parcelas (padrão: 1). */
        Integer intervaloMeses,

        /** true = divide o valor total pelas parcelas; false = repete o valor em cada parcela. */
        Boolean dividirValor
) {}
