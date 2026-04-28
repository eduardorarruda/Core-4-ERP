package br.com.core4erp.conta.dto;

import br.com.core4erp.enums.TipoConta;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContaCreateDto(
        @NotBlank(message = "Descrição é obrigatória")
        @Size(max = 255, message = "Descrição deve ter no máximo 255 caracteres")
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

        @NotNull(message = "Parceiro é obrigatório")
        Long parceiroId,

        @PositiveOrZero
        Integer quantidadeParcelas,

        Integer intervaloMeses,

        Boolean dividirValor,

        @Size(max = 50)
        String numeroDocumento,

        BigDecimal acrescimo,

        BigDecimal desconto
) {}
