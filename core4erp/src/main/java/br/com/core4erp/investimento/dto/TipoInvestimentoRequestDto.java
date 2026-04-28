package br.com.core4erp.investimento.dto;

import jakarta.validation.constraints.NotBlank;

public record TipoInvestimentoRequestDto(
        @NotBlank(message = "Nome é obrigatório")
        String nome
) {}
