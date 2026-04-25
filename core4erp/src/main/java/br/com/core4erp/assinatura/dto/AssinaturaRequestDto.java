package br.com.core4erp.assinatura.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record AssinaturaRequestDto(
        @NotBlank String descricao,
        @NotNull @Positive BigDecimal valor,
        @NotNull @Min(1) @Max(31) Integer diaVencimento,
        Boolean ativa,
        @NotNull Long categoriaId,
        Long parceiroId
) {}
