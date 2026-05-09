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

            String token = extractToken(request);
            if (token == null || !jwtService.isTokenValid(token)) {
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
                    // Persiste no request attribute para que o PerformanceMetricsFilter
                    // (filtro externo) possa ler após o MDC ser limpo pelo finally abaixo.
                    request.setAttribute("userId", email);
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
        // Reutiliza o requestId gerado pelo PerformanceMetricsFilter (filtro externo) se disponível,
        // garantindo que todos os logs da requisição compartilhem o mesmo ID.
        if (MDC.get("requestId") == null) {
            MDC.put("requestId", RequestUtils.resolveRequestId(request));
        }
        MDC.put("ipAddress", RequestUtils.resolveClientIp(request));
        MDC.put("httpMethod", request.getMethod());
        MDC.put("endpoint", request.getRequestURI());
    }

    private String extractToken(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("access_token".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
