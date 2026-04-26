package br.com.core4erp.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> chatBuckets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Bucket> uploadBuckets = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    public RateLimitFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !path.equals("/api/auth/login")
                && !path.equals("/api/auth/registrar")
                && !path.startsWith("/api/chat")
                && !path.equals("/api/conciliacao/upload");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String ip = resolveClientIp(request);
        String path = request.getServletPath();
        boolean isChat = path.startsWith("/api/chat");
        boolean isUpload = path.equals("/api/conciliacao/upload");
        Bucket bucket = isChat ? resolveChatBucket(ip)
                : isUpload ? resolveUploadBucket(ip)
                : resolveBucket(ip);

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            String msg = isChat
                    ? "Limite de mensagens atingido. Aguarde 1 minuto."
                    : isUpload
                    ? "Limite de uploads atingido. Aguarde 1 hora."
                    : "Muitas tentativas. Aguarde 1 minuto.";
            objectMapper.writeValue(response.getWriter(), Map.of("erro", msg));
        }
    }

    private Bucket resolveBucket(String ip) {
        return buckets.computeIfAbsent(ip, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.builder()
                                .capacity(10)
                                .refillIntervally(10, Duration.ofMinutes(1))
                                .build())
                        .build());
    }

    private Bucket resolveChatBucket(String ip) {
        return chatBuckets.computeIfAbsent(ip, k ->
                Bucket.builder()
                        .addLimit(Bandwidth.builder()
                                .capacity(30)
                                .refillIntervally(30, Duration.ofMinutes(1))
                                .build())
                        .build());
    }

    private Bucket resolveUploadBucket(String ip) {
        return uploadBuckets.computeIfAbsent(ip, k ->
                Bucket.builder()
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
