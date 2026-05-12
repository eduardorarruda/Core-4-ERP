package br.com.core4erp.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record EsqueciSenhaRequestDto(
        @NotBlank @Email String email
) {}
