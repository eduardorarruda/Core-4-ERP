package br.com.core4erp.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {

    private final RateLimitFilter filter =
            new RateLimitFilter(new ObjectMapper(), JwtServiceTest.hmac(), new ClientIpResolver(true));

    private int status(String metodo, String path, String ipCliente, String xff) throws Exception {
        MockHttpServletRequest r = new MockHttpServletRequest(metodo, path);
        r.setServletPath(path);
        r.setRemoteAddr("10.0.0.1");
        if (ipCliente != null) r.addHeader("CF-Connecting-IP", ipCliente);
        if (xff != null) r.addHeader("X-Forwarded-For", xff);
        MockHttpServletResponse resp = new MockHttpServletResponse();
        filter.doFilter(r, resp, new MockFilterChain());
        return resp.getStatus();
    }

    @Test
    void rotaSensivel_permite5EmJanelaDe15Min_depois429() throws Exception {
        for (int i = 0; i < 5; i++) {
            assertThat(status("POST", "/api/auth/esqueci-senha", "1.1.1.1", null)).isEqualTo(200);
        }
        assertThat(status("POST", "/api/auth/esqueci-senha", "1.1.1.1", null)).isEqualTo(429);
        // outro IP tem seu próprio balde; outra rota sensível também
        assertThat(status("POST", "/api/auth/esqueci-senha", "2.2.2.2", null)).isEqualTo(200);
        assertThat(status("POST", "/api/auth/redefinir-senha", "1.1.1.1", null)).isEqualTo(200);
    }

    @Test
    void trocarXForwardedFor_naoBurlaOLimite() throws Exception {
        for (int i = 0; i < 5; i++) {
            assertThat(status("GET", "/api/auth/convite/tok" + i, null, "9.9.9." + i)).isEqualTo(200);
        }
        assertThat(status("GET", "/api/auth/convite/outro", null, "7.7.7.7")).isEqualTo(429);
    }

    @Test
    void classificaRotasSensiveis() {
        assertThat(RateLimitFilter.rotaSensivel("/api/auth/me", "DELETE")).isEqualTo("excluir-conta");
        assertThat(RateLimitFilter.rotaSensivel("/api/auth/me", "GET")).isNull();
        assertThat(RateLimitFilter.rotaSensivel("/api/auth/senha", "PATCH")).isEqualTo("senha");
        assertThat(RateLimitFilter.rotaSensivel("/api/auth/aceitar-convite", "POST")).isEqualTo("aceitar-convite");
        assertThat(RateLimitFilter.rotaSensivel("/api/empresas", "POST")).isEqualTo("criar-empresa");
        assertThat(RateLimitFilter.rotaSensivel("/api/empresas", "GET")).isNull();
        assertThat(RateLimitFilter.rotaSensivel("/api/contas", "POST")).isNull();
    }

    @Test
    void rotaNaoLimitada_naoConsome() throws Exception {
        for (int i = 0; i < 20; i++) {
            assertThat(status("GET", "/api/contas", "1.1.1.1", null)).isEqualTo(200);
        }
    }

    @Test
    void resposta429_noFormatoDoHandler() throws Exception {
        for (int i = 0; i < 10; i++) status("POST", "/api/auth/login", "3.3.3.3", null);
        MockHttpServletRequest r = new MockHttpServletRequest("POST", "/api/auth/login");
        r.setServletPath("/api/auth/login");
        r.addHeader("CF-Connecting-IP", "3.3.3.3");
        MockHttpServletResponse resp = new MockHttpServletResponse();
        filter.doFilter(r, resp, new MockFilterChain());
        assertThat(resp.getStatus()).isEqualTo(429);
        assertThat(resp.getContentAsString()).contains("\"codigo\":\"MUITAS_TENTATIVAS\"").contains("\"mensagem\"");
        assertThat(resp.getHeader("Access-Control-Allow-Origin")).isNull();
    }
}
