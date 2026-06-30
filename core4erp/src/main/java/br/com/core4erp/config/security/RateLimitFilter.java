package br.com.core4erp.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final Cache<String, Bucket> buckets;
    private final Cache<String, Bucket> chatBuckets;
    private final Cache<String, Bucket> uploadBuckets;
    private final ObjectMapper objectMapper;
    private final JwtService jwtService;

    public RateLimitFilter(ObjectMapper objectMapper, JwtService jwtService) {
        this.objectMapper = objectMapper;
        this.jwtService = jwtService;
        this.buckets = Caffeine.newBuilder()
                .expireAfterAccess(10, TimeUnit.MINUTES)
                .maximumSize(5_000)
                .build();
        this.chatBuckets = Caffeine.newBuilder()
                .expireAfterAccess(10, TimeUnit.MINUTES)
                .maximumSize(5_000)
                .build();
        this.uploadBuckets = Caffeine.newBuilder()
                .expireAfterAccess(2, TimeUnit.HOURS)
                .maximumSize(5_000)
                .build();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !path.equals("/api/auth/login")
                && !path.equals("/api/auth/registrar")
                && !isChatAiCall(request)
                && !path.equals("/api/conciliacao/upload");
    }

    /**
     * Só as chamadas de IA (caras) contam no rate limit do chat — NÃO o clear de histórico
     * (DELETE /api/chat/historico) nem o download de relatório (GET /api/chat/relatorios/...).
     */
    private boolean isChatAiCall(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) return false;
        String path = request.getServletPath();
        return path.equals("/api/chat") || path.equals("/api/chat/stream");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String ip = resolveClientIp(request);
        String path = request.getServletPath();
        boolean isChat = isChatAiCall(request);
        boolean isUpload = path.equals("/api/conciliacao/upload");
        Bucket bucket = isChat ? resolveChatBucket(resolveChatKey(request, ip))
                : isUpload ? resolveUploadBucket(ip)
                        : resolveBucket(ip);

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            String origin = request.getHeader("Origin");
            if (origin != null) {
                response.setHeader("Access-Control-Allow-Origin", origin);
                response.setHeader("Access-Control-Allow-Credentials", "true");
                response.setHeader("Vary", "Origin");
            }
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            String msg = isChat ? "Limite de mensagens atingido. Aguarde 1 minuto."
                    : isUpload ? "Limite de uploads atingido. Aguarde 1 hora."
                            : "Muitas tentativas. Aguarde 1 minuto.";
            objectMapper.writeValue(response.getWriter(), Map.of("erro", msg));
        }
    }

    private Bucket resolveBucket(String ip) {
        return buckets.get(ip, k -> Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(10)
                        .refillIntervally(10, Duration.ofMinutes(1))
                        .build())
                .build());
    }

    /**
     * Chave do rate limit do chat: e-mail do usuário autenticado (do JWT) quando disponível,
     * caso contrário o IP. Resolve o token diretamente porque este filtro roda antes do
     * {@code JwtFilter}, então o {@code SecurityContext} ainda não está populado.
     */
    private String resolveChatKey(HttpServletRequest request, String ip) {
        try {
            String token = extractToken(request);
            if (token != null && jwtService.isTokenValid(token)) {
                String email = jwtService.extractEmail(token);
                if (email != null && !email.isBlank()) {
                    return "user:" + email;
                }
            }
        } catch (Exception ignored) {
            // Token inválido/ausente — cai para o IP
        }
        return "ip:" + ip;
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

    private Bucket resolveChatBucket(String key) {
        return chatBuckets.get(key, k -> Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(30)
                        .refillIntervally(30, Duration.ofMinutes(1))
                        .build())
                .build());
    }

    private Bucket resolveUploadBucket(String ip) {
        return uploadBuckets.get(ip, k -> Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(10)
                        .refillIntervally(10, Duration.ofHours(1))
                        .build())
                .build());
    }

    private String resolveClientIp(HttpServletRequest request) {
        // Trusted proxy header — use only when behind a known reverse proxy.
        // Disabled by default to prevent IP spoofing in direct deployments.
        // Enable by setting TRUSTED_PROXY=true and deploying behind a proxy.
        String trustedProxy = System.getenv("TRUSTED_PROXY");
        if ("true".equalsIgnoreCase(trustedProxy)) {
            String forwarded = request.getHeader("X-Forwarded-For");
            if (forwarded != null && !forwarded.isBlank()) {
                return forwarded.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}