package br.com.core4erp.config.security;

import br.com.core4erp.config.security.SessaoUsuarioService.SessaoUsuario;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Autentica a requisição a partir do JWT (cookie httpOnly {@code access_token} ou
 * {@code Authorization: Bearer}).
 *
 * <p>Além de assinatura/expiração ({@link JwtService}), confere a <b>versão do token</b> (claim
 * {@code tv}) com a versão atual do usuário: troca de senha, "sair de todos os dispositivos" e
 * exclusão de conta incrementam a versão e invalidam imediatamente os tokens antigos.
 *
 * <p>Publica a {@link SessaoUsuario} no atributo {@link SessaoUsuarioService#ATRIBUTO_REQUEST}
 * para os filtros seguintes (TenantFilter, SenhaProvisoriaFilter) e coloca {@code usuarioId} no MDC
 * (requestId/ip são responsabilidade do {@code RequestContextFilter}).
 */
@Component
public class JwtFilter extends OncePerRequestFilter {

    public static final String COOKIE_TOKEN = "access_token";
    static final String MDC_USUARIO_ID = "usuarioId";
    private static final String BEARER = "Bearer ";

    private final JwtService jwtService;
    private final SessaoUsuarioService sessaoUsuarioService;

    public JwtFilter(JwtService jwtService, SessaoUsuarioService sessaoUsuarioService) {
        this.jwtService = jwtService;
        this.sessaoUsuarioService = sessaoUsuarioService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        boolean mdcDefinido = false;
        try {
            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                Optional<SessaoUsuario> sessao = autenticar(request);
                if (sessao.isPresent()) {
                    MDC.put(MDC_USUARIO_ID, String.valueOf(sessao.get().id()));
                    mdcDefinido = true;
                }
            }
            chain.doFilter(request, response);
        } finally {
            if (mdcDefinido) {
                MDC.remove(MDC_USUARIO_ID);
            }
        }
    }

    private Optional<SessaoUsuario> autenticar(HttpServletRequest request) {
        JwtService.DadosToken dados = resolverToken(request);
        if (dados == null) return Optional.empty();

        Optional<SessaoUsuario> sessao = sessaoUsuarioService.buscar(dados.email());
        if (sessao.isEmpty()) {
            // Token de usuário que não existe mais (ex.: e-mail anonimizado) — segue sem autenticação
            return Optional.empty();
        }
        SessaoUsuario s = sessao.get();
        if (s.tokenVersion() != dados.tokenVersion()) {
            EventoSeguranca.info(EventoSeguranca.TOKEN_REVOGADO)
                    .addKeyValue("usuarioId", s.id())
                    .addKeyValue("jti", dados.jti())
                    .log("Token revogado apresentado — requisição segue sem autenticação");
            return Optional.empty();
        }

        User principal = new User(s.email(), "", List.of(new SimpleGrantedAuthority(s.role())));
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);
        request.setAttribute(SessaoUsuarioService.ATRIBUTO_REQUEST, s);
        return sessao;
    }

    /**
     * Seleciona o token da fonte de maior prioridade que passe pela validação do {@link JwtService}
     * (assinatura + algoritmo + expiração): (1) cookie httpOnly — método primário e imune a XSS;
     * (2) {@code Authorization: Bearer} — fallback para clientes sem cookie (ex.: n8n). Ambos passam
     * pela MESMA validação, então o Bearer não cria bypass.
     */
    private JwtService.DadosToken resolverToken(HttpServletRequest request) {
        JwtService.DadosToken doCookie = jwtService.validar(extrairCookie(request));
        if (doCookie != null) return doCookie;
        return jwtService.validar(extrairBearer(request));
    }

    static String extrairCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) {
            if (COOKIE_TOKEN.equals(cookie.getName())) {
                String value = cookie.getValue();
                return (value == null || value.isBlank()) ? null : value;
            }
        }
        return null;
    }

    static String extrairBearer(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith(BEARER)) {
            String value = authHeader.substring(BEARER.length()).trim();
            return value.isEmpty() ? null : value;
        }
        return null;
    }
}
