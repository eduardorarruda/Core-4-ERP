package br.com.core4erp.config.security;

import br.com.core4erp.utils.RequestUtils;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtFilter(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        try {
            populateMdc(request);

            // Resolve o token pela fonte de maior prioridade que seja VÁLIDA:
            // 1º cookie httpOnly (método primário), 2º header Authorization: Bearer (fallback).
            String token = resolveToken(request);
            if (token == null) {
                chain.doFilter(request, response);
                return;
            }

            String email = jwtService.extractEmail(token);
            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                try {
                    UserDetails userDetails = userDetailsService.loadUserByUsername(email);
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            userDetails, null, userDetails.getAuthorities()
                    );
                    auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    MDC.put("userId", email);
                } catch (org.springframework.security.core.userdetails.UsernameNotFoundException ignored) {
                    // Stale JWT — user no longer exists; proceed unauthenticated
                }
            }

            chain.doFilter(request, response);
        } finally {
            MDC.clear();
        }
    }

    private void populateMdc(HttpServletRequest request) {
        if (MDC.get("requestId") == null) {
            MDC.put("requestId", RequestUtils.resolveRequestId(request));
        }
        MDC.put("ipAddress", RequestUtils.resolveClientIp(request));
        MDC.put("httpMethod", request.getMethod());
        MDC.put("endpoint", request.getRequestURI());
    }

    /**
     * Seleciona o token JWT da fonte de maior prioridade que passe pela validação
     * do {@link JwtService} (assinatura + expiração).
     *
     * <p>Prioridade: (1) cookie httpOnly {@code access_token} — método primário e
     * imune a XSS; (2) header {@code Authorization: Bearer <token>} — fallback para
     * clientes sem cookie (ex.: n8n chamando a API REST). O header só é considerado
     * quando não há cookie válido, de modo que o cookie sempre tem prioridade e o
     * Bearer não cria bypass: ambos passam pela MESMA validação.</p>
     */
    private String resolveToken(HttpServletRequest request) {
        String cookieToken = extractCookieToken(request);
        if (cookieToken != null && jwtService.isTokenValid(cookieToken)) {
            return cookieToken;
        }

        String headerToken = extractBearerToken(request);
        if (headerToken != null && jwtService.isTokenValid(headerToken)) {
            return headerToken;
        }

        return null;
    }

    private String extractCookieToken(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("access_token".equals(cookie.getName())) {
                    String value = cookie.getValue();
                    return (value == null || value.isBlank()) ? null : value;
                }
            }
        }
        return null;
    }

    private String extractBearerToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String value = authHeader.substring(7).trim();
            return value.isEmpty() ? null : value;
        }
        return null;
    }
}
