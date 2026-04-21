package br.com.core4erp.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AtualizarPerfilRequestDto(
        @NotBlank String nome,
        @Size(min = 6, message = "Nova senha deve ter mínimo 6 caracteres") String novaSenha,
        @Size(max = 2_000_000, message = "Foto excede o tamanho máximo permitido (≈1.5 MB)") String fotoPerfil
) {}
