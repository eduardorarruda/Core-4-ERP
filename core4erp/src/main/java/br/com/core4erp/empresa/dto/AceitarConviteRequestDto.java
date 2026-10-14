package br.com.core4erp.empresa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AceitarConviteRequestDto(
    @NotBlank String token,
    @NotBlank @Size(min = 2, max = 100) String nome,
    @NotBlank
    @Size(min = 8, message = "Senha deve ter ao menos 8 caracteres")
    @Pattern(
        regexp = "^(?=.*[A-Z])(?=.*[0-9]).+$",
        message = "Senha deve conter ao menos uma letra maiúscula e um número"
    )
    String senha
) {}
