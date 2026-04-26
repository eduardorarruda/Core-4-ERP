package br.com.core4erp.conciliacao.dto;

import jakarta.validation.constraints.NotNull;

public record VincularItemRequestDto(
        @NotNull(message = "ID da conta é obrigatório")
        Long contaId
) {}
