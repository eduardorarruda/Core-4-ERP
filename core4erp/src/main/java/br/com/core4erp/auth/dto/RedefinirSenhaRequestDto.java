package br.com.core4erp.auth.dto;

import br.com.core4erp.auth.validation.SenhaForte;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RedefinirSenhaRequestDto(
        @NotBlank @Size(max = 128, message = "Link de redefinição inválido") String token,
        @NotBlank(message = "Informe a nova senha")
        @SenhaForte
        String novaSenha
) {}
