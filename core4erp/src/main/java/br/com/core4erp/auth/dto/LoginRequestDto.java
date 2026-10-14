package br.com.core4erp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequestDto(
        @NotBlank(message = "Email é obrigatório")
        @Email(message = "Email inválido")
        @Size(max = 254, message = "Email inválido")
        String email,

        @NotBlank(message = "Senha é obrigatória")
        @Size(max = 72, message = "A senha deve ter no máximo 72 caracteres")
        String senha
) {}
