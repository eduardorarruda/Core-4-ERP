package br.com.core4erp.plano.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record PagarPlanoRequestDto(
    @NotNull Long planoId,
    @NotBlank String forma
) {}
