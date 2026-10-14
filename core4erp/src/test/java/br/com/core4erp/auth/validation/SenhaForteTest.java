package br.com.core4erp.auth.validation;

import br.com.core4erp.auth.dto.RedefinirSenhaRequestDto;
import br.com.core4erp.auth.dto.RegistrarRequestDto;
import br.com.core4erp.auth.dto.TrocarSenhaRequestDto;
import br.com.core4erp.empresa.dto.AceitarConviteRequestDto;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/** A mesma política de senha forte vale para TODO DTO que cria senha. */
class SenhaForteTest {

    private static final ValidatorFactory FACTORY = Validation.buildDefaultValidatorFactory();
    private static final Validator VALIDATOR = FACTORY.getValidator();

    @AfterAll
    static void fechar() {
        FACTORY.close();
    }

    /** Cada DTO que cria senha, montado com a senha informada e os demais campos válidos. */
    private static final Set<Function<String, Object>> DTOS = Set.of(
            s -> new RegistrarRequestDto("Fulano", "fulano@empresa.com", s, null, null, null, true, "2026-10"),
            s -> new TrocarSenhaRequestDto("SenhaAtual1", s),
            s -> new RedefinirSenhaRequestDto("token", s),
            s -> new AceitarConviteRequestDto("token", "Fulano", s, true, "2026-10"));

    private static Set<String> violacoesDeSenha(Object dto) {
        return VALIDATOR.validate(dto).stream()
                .filter(v -> v.getPropertyPath().toString().matches("senha|novaSenha"))
                .map(ConstraintViolation::getMessage)
                .collect(Collectors.toSet());
    }

    @ParameterizedTest
    @ValueSource(strings = {"abcdefgh", "12345678", "ABCDEFGH1", "abcdefg1", "Senha1", "senhafraca1"})
    void senhaFraca_rejeitadaEmTodosOsDtos(String fraca) {
        DTOS.forEach(dto -> assertThat(violacoesDeSenha(dto.apply(fraca)))
                .as("DTO %s com senha '%s'", dto.apply(fraca).getClass().getSimpleName(), fraca)
                .anyMatch(m -> m.contains("maiúscula")));
    }

    @Test
    void senhaForte_aceitaEmTodosOsDtos() {
        DTOS.forEach(dto -> assertThat(violacoesDeSenha(dto.apply("Senha123"))).isEmpty());
    }

    @Test
    void senhaAcimaDe72Caracteres_rejeitada() {
        String longa = "Aa1" + "x".repeat(70);
        DTOS.forEach(dto -> assertThat(violacoesDeSenha(dto.apply(longa)))
                .anyMatch(m -> m.contains("no máximo 72")));
    }
}
