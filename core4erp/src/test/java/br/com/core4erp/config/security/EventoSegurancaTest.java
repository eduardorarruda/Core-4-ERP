package br.com.core4erp.config.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class EventoSegurancaTest {

    @Test
    void hashEmail_estavelNormalizadoENaoContemOEmail() {
        String h = EventoSeguranca.hashEmail("Fulano@Empresa.com ");
        assertThat(h).hasSize(16).isEqualTo(EventoSeguranca.hashEmail("fulano@empresa.com"));
        assertThat(h).doesNotContain("fulano");
        assertThat(EventoSeguranca.hashEmail(null)).isEqualTo("null");
    }
}
