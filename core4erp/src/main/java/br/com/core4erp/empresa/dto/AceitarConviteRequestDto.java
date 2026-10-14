package br.com.core4erp.empresa.dto;

import br.com.core4erp.auth.validation.SenhaForte;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AceitarConviteRequestDto(
    @NotBlank @Size(max = 128) String token,
    @NotBlank @Size(min = 2, max = 100) String nome,
    @NotBlank(message = "Informe a senha")
    @SenhaForte
    String senha,

    // LGPD art. 8º — mesmo consentimento exigido no registro
    @NotNull(message = "É necessário aceitar os Termos de Uso e a Política de Privacidade")
    @AssertTrue(message = "É necessário aceitar os Termos de Uso e a Política de Privacidade")
    Boolean aceiteTermos,

    @NotBlank(message = "Versão dos termos é obrigatória")
    @Size(max = 20, message = "Versão dos termos inválida")
    String versaoTermos
) {}
