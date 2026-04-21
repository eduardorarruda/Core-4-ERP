package br.com.core4erp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record RegistrarRequestDto(
        @NotBlank(message = "Nome é obrigatório")
        String nome,

        @NotBlank(message = "Email é obrigatório")
        @Email(message = "Email inválido")
        String email,

        @NotBlank(message = "Senha é obrigatória")
        @Pattern(
                regexp = "^(?=.*[A-Za-z])(?=.*\\d).{6,}$",
                message = "Senha deve ter mínimo 6 caracteres, incluindo letra e número"
        )
        String senha,

        Long telefone
) {}
