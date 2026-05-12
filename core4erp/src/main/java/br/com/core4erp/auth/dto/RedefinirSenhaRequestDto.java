package br.com.core4erp.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RedefinirSenhaRequestDto(
        @NotBlank String token,
        @NotBlank @Size(min = 8, message = "A senha deve ter no mínimo 8 caracteres") String novaSenha
) {}
