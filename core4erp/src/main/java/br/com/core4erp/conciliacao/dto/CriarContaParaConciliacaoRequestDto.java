package br.com.core4erp.conciliacao.dto;

import br.com.core4erp.enums.TipoConta;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CriarContaParaConciliacaoRequestDto(
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

        Long parceiroId
) {}
