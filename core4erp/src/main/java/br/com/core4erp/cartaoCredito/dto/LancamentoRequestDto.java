package br.com.core4erp.cartaoCredito.dto;

import br.com.core4erp.cartaoCredito.enums.TipoLancamentoCartao;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

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

        @NotNull(message = "Categoria é obrigatória")
        Long categoriaId,

        /** S.9: parceiro é opcional (ex.: compras sem fornecedor cadastrado, lançamentos pela IA). */
        Long parceiroId,

        /** Número de parcelas (>= 1). */
        @PositiveOrZero
        Integer quantidadeParcelas,

        /** true = divide o valor; false = repete em cada parcela. */
        Boolean dividirValor,

        /** SAIDA (default) ou ENTRADA (crédito/estorno). Valor sempre positivo, tipo indica direção. */
        TipoLancamentoCartao tipo
) {}
