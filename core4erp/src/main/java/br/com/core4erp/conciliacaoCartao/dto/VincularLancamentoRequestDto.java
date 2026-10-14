package br.com.core4erp.conciliacaoCartao.dto;

import jakarta.validation.constraints.NotNull;

public record VincularLancamentoRequestDto(
        @NotNull Long lancamentoId
) {}
