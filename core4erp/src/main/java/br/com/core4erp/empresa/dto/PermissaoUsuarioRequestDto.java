package br.com.core4erp.empresa.dto;

import jakarta.validation.constraints.NotNull;

public record PermissaoUsuarioRequestDto(
    @NotNull Long permissaoId,
    Boolean revogada,
    String observacao
) {}
