package br.com.core4erp.empresa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.Set;

public record PerfilAcessoRequestDto(
        @NotBlank String nome,
        String descricao,
        @NotEmpty(message = "É necessário selecionar pelo menos uma permissão para criar um perfil.") Set<Long> permissaoIds
) {}
