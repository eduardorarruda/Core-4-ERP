package br.com.core4erp.config.security;

import br.com.core4erp.auth.controller.AuthController;
import br.com.core4erp.auth.dto.MeResponseDto;
import br.com.core4erp.auth.service.AuthService;
import br.com.core4erp.auth.service.ContaUsuarioService;
import br.com.core4erp.auth.service.PasswordResetService;
import br.com.core4erp.auth.service.ProfileService;
import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.security.SessaoUsuarioService.SessaoUsuario;
import br.com.core4erp.config.tenant.PermissaoCacheConfig;
import br.com.core4erp.config.tenant.PermissaoCacheService;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.config.web.CorsConfig;
import br.com.core4erp.empresa.repository.UsuarioEmpresaPermissaoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Optional;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Cadeia de segurança real (filtros + regras do SecurityConfig) sobre o AuthController,
 * sem banco: repositórios e services mockados.
 */
@WebMvcTest(controllers = AuthController.class, properties = {
        "spring.main.allow-bean-definition-overriding=true",
        "jwt.secret=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        "jwt.expiration=3600000",
        "cors.allowed-origins=https://app.core4erp.com.br"
})
@Import({SecurityConfig.class, CorsConfig.class, JwtService.class, ClientIpResolver.class,
        TenantContext.class, PermissaoCacheConfig.class, PermissaoCacheService.class, PermissaoCalculadora.class})
class SecurityChainWebMvcTest {

    private static final String ORIGEM_OK = "https://app.core4erp.com.br";

    @Autowired private MockMvc mvc;
    @Autowired private JwtService jwtService;

    @MockitoBean private SessaoUsuarioService sessaoUsuarioService;
    @MockitoBean private UsuarioEmpresaRepository usuarioEmpresaRepository;
    @MockitoBean private UsuarioEmpresaPermissaoRepository usuarioEmpresaPermissaoRepository;
    @MockitoBean private UsuarioRepository usuarioRepository;
    @MockitoBean private AuthService authService;
    @MockitoBean private PasswordResetService passwordResetService;
    @MockitoBean private ProfileService profileService;
    @MockitoBean private ContaUsuarioService contaUsuarioService;

    @BeforeEach
    void stubs() {
        when(usuarioEmpresaRepository.findByUsuario_EmailAndAtivoTrue("a@b.com")).thenReturn(List.of());
        when(authService.me("a@b.com")).thenReturn(
                new MeResponseDto(7L, "A", "a@b.com", null, "ROLE_USER", null, "EMPRESA"));
    }

    private Cookie sessao(boolean senhaProvisoria, int versaoUsuario, int versaoToken) {
        when(sessaoUsuarioService.buscar("a@b.com")).thenReturn(Optional.of(
                new SessaoUsuario(7L, "a@b.com", versaoUsuario, senhaProvisoria, false, "EMPRESA", "ROLE_USER")));
        return new Cookie(JwtFilter.COOKIE_TOKEN, jwtService.generateToken("a@b.com", versaoToken));
    }

    @Test
    void portaPublica_naoServeActuator() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/prometheus").cookie(sessao(false, 0, 0))).andExpect(status().isForbidden());
    }

    @Test
    void semAutenticacao_401Json() throws Exception {
        mvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.codigo").value("NAO_AUTENTICADO"));
    }

    @Test
    void autenticado_acessaMe() throws Exception {
        mvc.perform(get("/api/auth/me").cookie(sessao(false, 0, 0)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("a@b.com"));
    }

    @Test
    void tokenRevogado_401() throws Exception {
        mvc.perform(get("/api/auth/me").cookie(sessao(false, 3, 2))).andExpect(status().isUnauthorized());
    }

    @Test
    void senhaProvisoria_bloqueiaExportacao_masLiberaMe() throws Exception {
        Cookie c = sessao(true, 0, 0);
        mvc.perform(get("/api/auth/me/dados").cookie(c))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("SENHA_PROVISORIA"))
                .andExpect(jsonPath("$.mensagem").value("Troque sua senha provisória para continuar"));
        mvc.perform(get("/api/auth/me").cookie(c)).andExpect(status().isOk());
    }

    @Test
    void csrf_postComCookieDeOrigemNaoPermitida_403() throws Exception {
        // Origem fora da allowlist: o CorsFilter já recusa (403) antes do OrigemRequisicaoFilter
        mvc.perform(post("/api/auth/logout").cookie(sessao(false, 0, 0)).header("Origin", "https://evil.example"))
                .andExpect(status().isForbidden())
                // recusa do CORS no JSON de erro padrão (antes: texto puro "Invalid CORS request")
                .andExpect(jsonPath("$.codigo").value("ORIGEM_NAO_PERMITIDA"))
                .andExpect(jsonPath("$.mensagem").isNotEmpty());
    }

    @Test
    void cors_preflightDeOrigemNaoPermitida_403Json() throws Exception {
        mvc.perform(options("/api/auth/login").header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ORIGEM_NAO_PERMITIDA"));
    }

    @Test
    void csrf_postComCookieSemOriginNemReferer_403Json() throws Exception {
        mvc.perform(post("/api/auth/logout").cookie(sessao(false, 0, 0)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.codigo").value("ORIGEM_NAO_PERMITIDA"));
    }

    @Test
    void bearerSemCookie_naoPrecisaDeOrigin() throws Exception {
        sessao(false, 0, 0);
        mvc.perform(post("/api/auth/logout")
                        .header("Authorization", "Bearer " + jwtService.generateToken("a@b.com", 0)))
                .andExpect(status().isNoContent());
    }

    @Test
    void csrf_postComCookieDaOrigemDoFront_passa() throws Exception {
        mvc.perform(post("/api/auth/logout").cookie(sessao(false, 0, 0)).header("Origin", ORIGEM_OK))
                .andExpect(status().isNoContent());
    }

    @Test
    void cookieDeSessao_saiComSameSiteLaxPorPadrao() throws Exception {
        mvc.perform(post("/api/auth/logout").cookie(sessao(false, 0, 0)).header("Origin", ORIGEM_OK))
                .andExpect(result -> org.assertj.core.api.Assertions
                        .assertThat(result.getResponse().getHeader("Set-Cookie")).contains("SameSite=Lax"));
    }
}
