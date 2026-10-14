package br.com.core4erp.empresa.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ConvidarOperadorRequestDto(
    @NotBlank @Email String email,
    @NotNull Long perfilId
) {}
