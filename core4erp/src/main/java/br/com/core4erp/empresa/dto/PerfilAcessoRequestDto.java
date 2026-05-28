package br.com.core4erp.empresa.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.Set;

public record PerfilAcessoRequestDto(
        @NotBlank String nome,
        String descricao,
        Set<Long> permissaoIds
) {}
