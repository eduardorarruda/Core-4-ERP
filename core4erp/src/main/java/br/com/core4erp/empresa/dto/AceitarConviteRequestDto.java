package br.com.core4erp.empresa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AceitarConviteRequestDto(
    @NotBlank String token,
    @NotBlank @Size(min = 2, max = 100) String nome,
    @NotBlank @Size(min = 8) String senha
) {}
