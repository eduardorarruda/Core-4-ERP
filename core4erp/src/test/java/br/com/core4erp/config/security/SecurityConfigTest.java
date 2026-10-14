package br.com.core4erp.config.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.web.util.matcher.RequestMatcher;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigTest {

    private static MockHttpServletRequest naPorta(int porta) {
        MockHttpServletRequest r = new MockHttpServletRequest("GET", "/actuator/prometheus");
        r.setLocalPort(porta);
        return r;
    }

    @Test
    void cadeiaDoActuator_casaSomenteNaPortaDeGerenciamento() {
        RequestMatcher m = SecurityConfig.portaDeGerenciamento(8081, 8080);
        assertThat(m.matches(naPorta(8081))).isTrue();
        assertThat(m.matches(naPorta(8080))).isFalse();
    }

    @Test
    void semPortaSeparada_cadeiaDoActuatorNaoCasaNada() {
        assertThat(SecurityConfig.portaDeGerenciamento(-1, 8080).matches(naPorta(8080))).isFalse();
        assertThat(SecurityConfig.portaDeGerenciamento(8080, 8080).matches(naPorta(8080))).isFalse();
    }
}
