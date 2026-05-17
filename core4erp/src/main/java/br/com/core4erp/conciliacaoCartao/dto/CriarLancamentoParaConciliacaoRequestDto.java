package br.com.core4erp.conciliacaoCartao.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CriarLancamentoParaConciliacaoRequestDto(
        @NotBlank String descricao,
        @NotNull @Positive BigDecimal valor,
        @NotNull LocalDate dataCompra,
        @NotNull Long categoriaId,
        Long parceiroId
) {}
