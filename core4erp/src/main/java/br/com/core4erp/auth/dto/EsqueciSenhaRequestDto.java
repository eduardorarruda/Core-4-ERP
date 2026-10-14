package br.com.core4erp.auth.dto;

import br.com.core4erp.auth.validation.EmailEstrito;
import jakarta.validation.constraints.NotBlank;

public record EsqueciSenhaRequestDto(
        @NotBlank(message = "Email é obrigatório") @EmailEstrito String email
) {}
