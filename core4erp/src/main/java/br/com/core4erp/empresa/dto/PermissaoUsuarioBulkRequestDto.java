package br.com.core4erp.empresa.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record PermissaoUsuarioBulkRequestDto(
    @NotNull List<PermissaoUsuarioRequestDto> permissoes
) {}
