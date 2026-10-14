package br.com.core4erp.auth.dto;

import br.com.core4erp.usuario.entity.Usuario;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class AuthDtoValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private static RegistrarRequestDto registro(String email, String senha, Boolean aceite, String versao) {
        return new RegistrarRequestDto("Fulano", email, senha, null, Usuario.TipoConta.EMPRESA, null, aceite, versao);
    }

    private static Set<String> mensagens(Set<? extends ConstraintViolation<?>> v) {
        return v.stream().map(ConstraintViolation::getMessage).collect(java.util.stream.Collectors.toSet());
    }

    @Test
    void registro_valido() {
        assertThat(validator.validate(registro("a@b.com", "Senha123", true, "2026-10"))).isEmpty();
    }

    @Test
    void registro_semAceiteDosTermos_recusado() {
        String msg = "É necessário aceitar os Termos de Uso e a Política de Privacidade";
        assertThat(mensagens(validator.validate(registro("a@b.com", "Senha123", false, "v1")))).contains(msg);
        assertThat(mensagens(validator.validate(registro("a@b.com", "Senha123", null, "v1")))).contains(msg);
    }

    @Test
    void registro_versaoDosTermosObrigatoriaEAte20() {
        assertThat(validator.validate(registro("a@b.com", "Senha123", true, " "))).isNotEmpty();
        assertThat(validator.validate(registro("a@b.com", "Senha123", true, "x".repeat(21)))).isNotEmpty();
    }

    @Test
    void registro_senhaMaiorQue72_recusada_cve2025_22228() {
        assertThat(validator.validate(registro("a@b.com", "Aa1" + "x".repeat(70), true, "v1"))).isNotEmpty();
    }

    @Test
    void registro_emailComDisplayName_recusado() {
        assertThat(validator.validate(registro("Fulano <a@b.com>", "Senha123", true, "v1"))).isNotEmpty();
    }

    @Test
    void senhasLimitadasA72EmTodosOsDtos() {
        String longa = "Aa1" + "x".repeat(70);
        assertThat(validator.validate(new LoginRequestDto("a@b.com", longa))).isNotEmpty();
        assertThat(validator.validate(new TrocarSenhaRequestDto("Senha123", longa))).isNotEmpty();
        assertThat(validator.validate(new RedefinirSenhaRequestDto("tok", longa))).isNotEmpty();
        assertThat(validator.validate(new ExcluirContaRequestDto(longa))).isNotEmpty();
        assertThat(validator.validate(new br.com.core4erp.empresa.dto.AceitarConviteRequestDto(
                "tok", "Nome", longa, true, "v1"))).isNotEmpty();
    }

    @Test
    void perfil_naoTemMaisCampoDeSenha() {
        assertThat(java.util.Arrays.stream(AtualizarPerfilRequestDto.class.getRecordComponents())
                .map(java.lang.reflect.RecordComponent::getName)).doesNotContain("novaSenha");
    }

    @Test
    void aceitarConvite_exigeAceiteDosTermos() {
        var semAceite = new br.com.core4erp.empresa.dto.AceitarConviteRequestDto("tok", "Nome", "Senha123", false, "v1");
        var semVersao = new br.com.core4erp.empresa.dto.AceitarConviteRequestDto("tok", "Nome", "Senha123", true, "");
        var ok = new br.com.core4erp.empresa.dto.AceitarConviteRequestDto("tok", "Nome", "Senha123", true, "2026-10");
        assertThat(validator.validate(semAceite)).isNotEmpty();
        assertThat(validator.validate(semVersao)).isNotEmpty();
        assertThat(validator.validate(ok)).isEmpty();
    }
}
