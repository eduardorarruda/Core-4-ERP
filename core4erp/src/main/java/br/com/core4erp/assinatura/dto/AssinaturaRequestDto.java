package br.com.core4erp.assinatura.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record AssinaturaRequestDto(
        @NotBlank(message = "Descrição da assinatura é obrigatória")
        String descricao,

        @NotNull(message = "Valor da assinatura é obrigatório")
        @Positive(message = "Valor da assinatura deve ser positivo")
        BigDecimal valor,

        @NotNull(message = "Dia de vencimento é obrigatório")
        @Min(value = 1, message = "Dia de vencimento deve ser entre 1 e 31")
        @Max(value = 31, message = "Dia de vencimento deve ser entre 1 e 31")
        Integer diaVencimento,

        Boolean ativa,

        @NotNull(message = "Categoria é obrigatória")
        Long categoriaId,

        /** Opcional — o service só vincula quando informado (assinatura sem parceiro é válida). */
        Long parceiroId,

        Long cartaoCreditoId
) {}
