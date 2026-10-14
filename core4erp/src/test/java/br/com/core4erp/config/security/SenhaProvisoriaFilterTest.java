package br.com.core4erp.config.security;

import br.com.core4erp.config.security.SessaoUsuarioService.SessaoUsuario;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class SenhaProvisoriaFilterTest {

    private final SenhaProvisoriaFilter filter =
            new SenhaProvisoriaFilter(new ObjectMapper().registerModule(new JavaTimeModule()));

    private static MockHttpServletRequest req(String metodo, String path, boolean provisoria) {
        MockHttpServletRequest r = new MockHttpServletRequest(metodo, path);
        r.setServletPath(path);
        r.setAttribute(SessaoUsuarioService.ATRIBUTO_REQUEST,
                new SessaoUsuario(1L, "a@b.com", 0, provisoria, false, "EMPRESA", "ROLE_USER"));
        return r;
    }

    @Test
    void senhaProvisoria_rotaComum_bloqueiaCom403Json() throws Exception {
        MockHttpServletResponse resp = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(req("GET", "/api/contas", true), resp, chain);

        assertThat(resp.getStatus()).isEqualTo(403);
        assertThat(resp.getContentAsString())
                .contains("\"codigo\":\"SENHA_PROVISORIA\"")
                .contains("Troque sua senha provisória para continuar");
        assertThat(chain.getRequest()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/auth/me", "/api/auth/me/permissoes", "/api/auth/senha",
            "/api/auth/logout", "/api/auth/trocar-empresa"})
    void senhaProvisoria_rotasDoFluxoDeTroca_liberadas(String path) throws Exception {
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(req("POST", path, true), new MockHttpServletResponse(), chain);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void senhaDefinitiva_naoBloqueia() throws Exception {
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(req("GET", "/api/contas", false), new MockHttpServletResponse(), chain);
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void naoAutenticado_naoBloqueia() throws Exception {
        MockHttpServletRequest r = new MockHttpServletRequest("GET", "/api/planos/ativos");
        r.setServletPath("/api/planos/ativos");
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(r, new MockHttpServletResponse(), chain);
        assertThat(chain.getRequest()).isNotNull();
    }
}
