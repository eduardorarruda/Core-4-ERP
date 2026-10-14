package br.com.core4erp.auth.dto;

import br.com.core4erp.auth.validation.EmailEstrito;
import br.com.core4erp.auth.validation.SenhaForte;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegistrarRequestDto(
        @NotBlank(message = "Nome é obrigatório")
        @Size(max = 150, message = "Nome deve ter no máximo 150 caracteres")
        String nome,

        @NotBlank(message = "Email é obrigatório")
        @EmailEstrito
        String email,

        // Política única (8–72, maiúscula, minúscula e número) — ver @SenhaForte.
        @NotBlank(message = "Senha é obrigatória")
        @SenhaForte
        String senha,

        @Pattern(regexp = "^[+]?[0-9 \\-()]{0,20}$", message = "Telefone inválido")
        String telefone,

        Usuario.TipoConta tipoConta,

        @Size(max = 150, message = "Nome da empresa deve ter no máximo 150 caracteres")
        String nomeEmpresa,

        // LGPD art. 8º — consentimento expresso e registrado
        @NotNull(message = "É necessário aceitar os Termos de Uso e a Política de Privacidade")
        @AssertTrue(message = "É necessário aceitar os Termos de Uso e a Política de Privacidade")
        Boolean aceiteTermos,

        @NotBlank(message = "Versão dos termos é obrigatória")
        @Size(max = 20, message = "Versão dos termos inválida")
        String versaoTermos
) {}
