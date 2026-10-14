package br.com.core4erp.auth.dto;

import br.com.core4erp.auth.validation.SenhaForte;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TrocarSenhaRequestDto(
    @NotBlank(message = "Informe a senha atual")
    @Size(max = 72, message = "A senha deve ter no máximo 72 caracteres")
    String senhaAtual,
    @NotBlank(message = "Informe a nova senha")
    @SenhaForte
    String novaSenha
) {}
