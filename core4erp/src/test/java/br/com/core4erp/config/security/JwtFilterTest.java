package br.com.core4erp.config.security;

import br.com.core4erp.config.security.SessaoUsuarioService.SessaoUsuario;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtFilterTest {

    private final JwtService jwtService = JwtServiceTest.hmac();
    private final SessaoUsuarioService sessaoService = mock(SessaoUsuarioService.class);
    private final JwtFilter filter = new JwtFilter(jwtService, sessaoService);

    @AfterEach
    void limpar() {
        SecurityContextHolder.clearContext();
    }

    private static SessaoUsuario sessao(int tokenVersion) {
        return new SessaoUsuario(7L, "a@b.com", tokenVersion, false, false, "EMPRESA", "ROLE_USER");
    }

    private MockHttpServletRequest requisicaoComCookie(String token) {
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/contas");
        req.setServletPath("/api/contas");
        req.setCookies(new Cookie(JwtFilter.COOKIE_TOKEN, token));
        return req;
    }

    @Test
    void versaoDoTokenIgualAoUsuario_autentica() throws Exception {
        when(sessaoService.buscar("a@b.com")).thenReturn(Optional.of(sessao(2)));
        MockHttpServletRequest req = requisicaoComCookie(jwtService.generateToken("a@b.com", 2));
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(req, new MockHttpServletResponse(), chain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName()).isEqualTo("a@b.com");
        assertThat(req.getAttribute(SessaoUsuarioService.ATRIBUTO_REQUEST)).isEqualTo(sessao(2));
        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void tokenRevogado_versaoAntiga_naoAutentica() throws Exception {
        when(sessaoService.buscar("a@b.com")).thenReturn(Optional.of(sessao(3)));
        MockHttpServletRequest req = requisicaoComCookie(jwtService.generateToken("a@b.com", 2));

        filter.doFilter(req, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(req.getAttribute(SessaoUsuarioService.ATRIBUTO_REQUEST)).isNull();
    }

    @Test
    void usuarioInexistente_naoAutentica() throws Exception {
        when(sessaoService.buscar("a@b.com")).thenReturn(Optional.empty());
        filter.doFilter(requisicaoComCookie(jwtService.generateToken("a@b.com", 0)),
                new MockHttpServletResponse(), new MockFilterChain());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void bearerValido_semCookie_autentica() throws Exception {
        when(sessaoService.buscar("a@b.com")).thenReturn(Optional.of(sessao(0)));
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/contas");
        req.addHeader("Authorization", "Bearer " + jwtService.generateToken("a@b.com", 0));

        filter.doFilter(req, new MockHttpServletResponse(), new MockFilterChain());

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    void tokenInvalido_naoAutentica() throws Exception {
        filter.doFilter(requisicaoComCookie("lixo"), new MockHttpServletResponse(), new MockFilterChain());
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }
}
