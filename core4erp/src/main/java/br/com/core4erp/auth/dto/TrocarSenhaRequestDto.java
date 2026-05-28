package br.com.core4erp.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TrocarSenhaRequestDto(
    @NotBlank String senhaAtual,
    @NotBlank @Size(min = 8) String novaSenha
) {}
