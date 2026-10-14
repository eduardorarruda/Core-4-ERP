package br.com.core4erp.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OrigemRequisicaoFilterTest {

    private final OrigemRequisicaoFilter filter;

    OrigemRequisicaoFilterTest() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOrigins(List.of("https://app.core4erp.com.br"));
        cfg.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        filter = new OrigemRequisicaoFilter(source, new ObjectMapper().registerModule(new JavaTimeModule()));
    }

    private static MockHttpServletRequest req(String metodo, boolean comCookie) {
        MockHttpServletRequest r = new MockHttpServletRequest(metodo, "/api/contas");
        r.setServletPath("/api/contas");
        if (comCookie) r.setCookies(new Cookie(JwtFilter.COOKIE_TOKEN, "tok"));
        return r;
    }

    private static boolean passou(MockFilterChain chain) {
        return chain.getRequest() != null;
    }

    @Test
    void postComCookieEOrigemPermitida_passa() throws Exception {
        MockHttpServletRequest r = req("POST", true);
        r.addHeader("Origin", "https://app.core4erp.com.br");
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(r, new MockHttpServletResponse(), chain);
        assertThat(passou(chain)).isTrue();
    }

    @Test
    void postComCookieEOrigemEstranha_bloqueia403() throws Exception {
        MockHttpServletRequest r = req("DELETE", true);
        r.addHeader("Origin", "https://evil.example");
        MockHttpServletResponse resp = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(r, resp, chain);
        assertThat(passou(chain)).isFalse();
        assertThat(resp.getStatus()).isEqualTo(403);
        assertThat(resp.getContentAsString()).contains(OrigemRequisicaoFilter.CODIGO);
    }

    @Test
    void postComCookieSemOrigemMasRefererPermitido_passa() throws Exception {
        MockHttpServletRequest r = req("PUT", true);
        r.addHeader("Referer", "https://app.core4erp.com.br/contas?x=1");
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(r, new MockHttpServletResponse(), chain);
        assertThat(passou(chain)).isTrue();
    }

    @Test
    void postComCookieSemOrigemNemReferer_bloqueia() throws Exception {
        MockHttpServletResponse resp = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(req("PATCH", true), resp, chain);
        assertThat(passou(chain)).isFalse();
        assertThat(resp.getStatus()).isEqualTo(403);
    }

    @Test
    void postSemCookie_bearerDoN8n_naoAfetado() throws Exception {
        MockHttpServletRequest r = req("POST", false);
        r.addHeader("Origin", "https://evil.example");
        r.addHeader("Authorization", "Bearer abc");
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(r, new MockHttpServletResponse(), chain);
        assertThat(passou(chain)).isTrue();
    }

    @Test
    void getComCookieDeOutraOrigem_naoAfetado() throws Exception {
        MockHttpServletRequest r = req("GET", true);
        r.addHeader("Origin", "https://evil.example");
        MockFilterChain chain = new MockFilterChain();
        filter.doFilter(r, new MockHttpServletResponse(), chain);
        assertThat(passou(chain)).isTrue();
    }

    @Test
    void refererMalformado_ignorado() {
        MockHttpServletRequest r = req("POST", true);
        r.addHeader("Referer", "::::");
        assertThat(OrigemRequisicaoFilter.origemDaRequisicao(r)).isNull();
    }
}
