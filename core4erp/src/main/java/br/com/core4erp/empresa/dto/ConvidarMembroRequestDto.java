package br.com.core4erp.empresa.dto;

import br.com.core4erp.auth.validation.EmailEstrito;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ConvidarMembroRequestDto(
    @NotBlank @EmailEstrito String email,
    @NotNull Long perfilId
) {}
