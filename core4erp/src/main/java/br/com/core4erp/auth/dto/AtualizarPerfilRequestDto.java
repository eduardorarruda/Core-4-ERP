package br.com.core4erp.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record AtualizarPerfilRequestDto(
        @NotBlank String nome,
        String novaSenha,
        String fotoPerfil
) {}
