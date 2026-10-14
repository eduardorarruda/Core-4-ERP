package br.com.core4erp.config.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Resolve o IP real do cliente (rate limit, logs de segurança, auditoria).
 *
 * <p>Sem proxy confiável ({@code TRUSTED_PROXY=false}, padrão) usa SEMPRE o {@code remoteAddr} —
 * qualquer cabeçalho pode ser forjado pelo cliente. Com {@code TRUSTED_PROXY=true} (atrás do
 * Cloudflare/nginx) usa, nesta ordem: {@code CF-Connecting-IP}, {@code X-Real-IP} e por fim o
 * {@code remoteAddr}. <b>Nunca</b> usa o valor mais à esquerda do {@code X-Forwarded-For}: ele é
 * escrito pelo cliente e permitiria burlar o rate limit trocando o IP a cada requisição.
 */
@Component
public class ClientIpResolver {

    static final String CF_CONNECTING_IP = "CF-Connecting-IP";
    static final String X_REAL_IP = "X-Real-IP";
    private static final int MAX_IP_LENGTH = 45; // IPv6 completo

    private final boolean trustedProxy;

    public ClientIpResolver(@Value("${security.trusted-proxy:${TRUSTED_PROXY:false}}") boolean trustedProxy) {
        this.trustedProxy = trustedProxy;
    }

    public String resolver(HttpServletRequest request) {
        if (trustedProxy) {
            String cf = valido(request.getHeader(CF_CONNECTING_IP));
            if (cf != null) return cf;
            String real = valido(request.getHeader(X_REAL_IP));
            if (real != null) return real;
        }
        return request.getRemoteAddr();
    }

    /** Aceita apenas um IP (v4/v6) plausível — descarta listas, espaços e valores gigantes. */
    private static String valido(String valor) {
        if (valor == null) return null;
        String v = valor.trim();
        if (v.isEmpty() || v.length() > MAX_IP_LENGTH || !v.matches("[0-9A-Fa-f:.]+")) return null;
        return v;
    }
}
