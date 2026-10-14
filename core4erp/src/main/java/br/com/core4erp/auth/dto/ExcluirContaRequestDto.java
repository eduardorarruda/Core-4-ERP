package br.com.core4erp.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Confirmação da exclusão da própria conta (LGPD art. 18, VI) — exige a senha atual. */
public record ExcluirContaRequestDto(
        @NotBlank(message = "Informe sua senha para confirmar a exclusão")
        @Size(max = 72, message = "A senha deve ter no máximo 72 caracteres")
        String senha
) {}
