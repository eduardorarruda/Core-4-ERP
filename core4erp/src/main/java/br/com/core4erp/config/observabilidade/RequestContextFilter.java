package br.com.core4erp.config.observabilidade;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Filtro mais externo da aplicação (precedência máxima): estabelece o contexto de rastreio de cada
 * requisição e registra uma linha de access log estruturada.
 *
 * <ul>
 *   <li><b>X-Request-Id</b>: aceita o valor recebido somente se for um token seguro (UUID ou
 *       token curto alfanumérico — evita injeção em log/headers); senão gera um UUID. O valor é
 *       devolvido no header de resposta {@code X-Request-Id} e colocado no MDC ({@code requestId}).</li>
 *   <li><b>IP do cliente</b> no MDC ({@code ip}): com {@code TRUSTED_PROXY=true} (atrás de
 *       Cloudflare/nginx confiáveis) usa {@code CF-Connecting-IP}, depois {@code X-Real-IP};
 *       caso contrário, sempre {@code remoteAddr} (headers do cliente são forjáveis).</li>
 *   <li><b>Access log</b>: uma linha INFO por requisição com método, path (sem query string —
 *       pode conter dados pessoais/tokens), status e duração. {@code /actuator} é ignorado.</li>
 * </ul>
 *
 * <p>O MDC é limpo no {@code finally} (threads do Tomcat são reaproveitadas).
 */
// Nome de bean explícito: "requestContextFilter" já é o OrderedRequestContextFilter do Spring MVC.
@Component("contextoRequisicaoFilter")
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestContextFilter extends OncePerRequestFilter {

    public static final String HEADER_REQUEST_ID = "X-Request-Id";
    public static final String MDC_REQUEST_ID = "requestId";
    public static final String MDC_IP = "ip";

    private static final Logger accessLog = LoggerFactory.getLogger("core4erp.acesso");

    /** UUID (36) ou token curto [A-Za-z0-9_-] de 8 a 64 caracteres. */
    private static final Pattern REQUEST_ID_SEGURO = Pattern.compile("^[A-Za-z0-9_-]{8,64}$");
    /** Apenas caracteres válidos de IPv4/IPv6 — header fora disso é descartado. */
    private static final Pattern IP_SEGURO = Pattern.compile("^[0-9A-Fa-f:.]{2,45}$");
    private static final String PREFIXO_ACTUATOR = "/actuator";

    private final boolean proxyConfiavel;

    public RequestContextFilter(@Value("${security.trusted-proxy:${TRUSTED_PROXY:false}}") String trustedProxy) {
        this.proxyConfiavel = "true".equalsIgnoreCase(trustedProxy == null ? "" : trustedProxy.strip());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        long inicio = System.nanoTime();
        String requestId = resolverRequestId(request.getHeader(HEADER_REQUEST_ID));
        String ip = resolverIp(request);

        MDC.put(MDC_REQUEST_ID, requestId);
        MDC.put(MDC_IP, ip);
        response.setHeader(HEADER_REQUEST_ID, requestId);

        try {
            chain.doFilter(request, response);
        } finally {
            try {
                // Filtros internos podem ter limpado o MDC no finally deles — restaura o contexto
                // de rastreio para que a linha de acesso carregue requestId/ip.
                MDC.put(MDC_REQUEST_ID, requestId);
                MDC.put(MDC_IP, ip);
                registrarAcesso(request, response, inicio);
            } finally {
                MDC.clear();
            }
        }
    }

    private void registrarAcesso(HttpServletRequest request, HttpServletResponse response, long inicio) {
        String path = request.getRequestURI();
        if (path != null && path.startsWith(PREFIXO_ACTUATOR)) {
            return;
        }
        long duracaoMs = (System.nanoTime() - inicio) / 1_000_000;
        accessLog.atInfo()
                .addKeyValue("http.method", request.getMethod())
                .addKeyValue("url.path", path)
                .addKeyValue("http.status", response.getStatus())
                .addKeyValue("duracaoMs", duracaoMs)
                .log("requisicao concluida");
    }

    /** Aceita o X-Request-Id recebido só se for seguro; caso contrário gera um UUID novo. */
    static String resolverRequestId(String recebido) {
        if (recebido != null) {
            String r = recebido.strip();
            if (REQUEST_ID_SEGURO.matcher(r).matches()) {
                return r;
            }
        }
        return UUID.randomUUID().toString();
    }

    /**
     * Mesmas regras do {@code ClientIpResolver} de {@code config/security} (mantidas idênticas):
     * só confia nos headers do proxy com {@code TRUSTED_PROXY=true}; ordem CF-Connecting-IP →
     * X-Real-IP → remoteAddr.
     */
    String resolverIp(HttpServletRequest request) {
        if (proxyConfiavel) {
            String cf = ipValido(request.getHeader("CF-Connecting-IP"));
            if (cf != null) {
                return cf;
            }
            String real = ipValido(request.getHeader("X-Real-IP"));
            if (real != null) {
                return real;
            }
        }
        return request.getRemoteAddr();
    }

    private static String ipValido(String valor) {
        if (valor == null) {
            return null;
        }
        String v = valor.strip();
        return IP_SEGURO.matcher(v).matches() ? v : null;
    }
}
