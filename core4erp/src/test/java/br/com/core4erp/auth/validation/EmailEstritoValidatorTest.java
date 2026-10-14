package br.com.core4erp.auth.validation;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class EmailEstritoValidatorTest {

    @ParameterizedTest
    @ValueSource(strings = {"fulano@empresa.com", "a.b+tag@sub.dominio.com.br", "x_y@a-b.io"})
    void aceitaEmailsComuns(String email) {
        assertThat(EmailEstritoValidator.valido(email)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "\"Banco\" <fulano@empresa.com>",
            "Fulano <fulano@empresa.com>",
            "fulano@localhost",
            "fulano@empresa",
            "ful ano@empresa.com",
            "fulano@empresa.com\r\nBcc: x@y.com",
            "a@b@c.com",
            "@empresa.com",
            "fulano@.com",
            "fulano@empresa..com",
            ".fulano@empresa.com"
    })
    void recusaDisplayNameControlesESemPontoNoDominio(String email) {
        assertThat(EmailEstritoValidator.valido(email)).isFalse();
    }

    @org.junit.jupiter.api.Test
    void recusaMaisDe254Caracteres() {
        String longo = "a".repeat(60) + "@" + "b".repeat(60) + "." + "c".repeat(60) + "." + "d".repeat(60) + "." + "e".repeat(60) + ".com";
        assertThat(longo.length()).isGreaterThan(254);
        assertThat(EmailEstritoValidator.valido(longo)).isFalse();
        assertThat(EmailEstritoValidator.valido("a".repeat(65) + "@x.com")).isFalse();
    }
}
