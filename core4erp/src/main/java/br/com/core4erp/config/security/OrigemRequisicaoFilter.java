package br.com.core4erp.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.net.URI;
import java.util.Set;

/**
 * Defesa em profundidade contra CSRF (além do cookie {@code SameSite=Lax}).
 *
 * <p>Para métodos que alteram estado (POST/PUT/PATCH/DELETE) em {@code /api/**} <b>quando a
 * requisição carrega o cookie de autenticação</b>, exige que o {@code Origin} (ou, na falta dele,
 * a origem do {@code Referer}) esteja na allowlist do CORS ({@code CORS_ORIGINS}). Requisições sem
 * o cookie (ex.: n8n com {@code Authorization: Bearer}) não são afetadas: CSRF depende do envio
 * automático do cookie pelo navegador.
 *
 * <p>Não é um bean (instanciado no {@code SecurityConfig}).
 */
public class OrigemRequisicaoFilter extends OncePerRequestFilter {

    static final String CODIGO = "ORIGEM_NAO_PERMITIDA";
    static final String MENSAGEM =
            "Requisição bloqueada por segurança. Recarregue a página e tente novamente.";
    private static final Set<String> METODOS_SEGUROS = Set.of("GET", "HEAD", "OPTIONS", "TRACE");

    private final CorsConfigurationSource corsSource;
    private final ObjectMapper objectMapper;

    public OrigemRequisicaoFilter(CorsConfigurationSource corsSource, ObjectMapper objectMapper) {
        this.corsSource = corsSource;
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return METODOS_SEGUROS.contains(request.getMethod().toUpperCase())
                || !RespostaErroJson.caminho(request).startsWith("/api/")
                || JwtFilter.extrairCookie(request) == null;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String origem = origemDaRequisicao(request);
        if (origem != null && permitida(request, origem)) {
            chain.doFilter(request, response);
            return;
        }
        EventoSeguranca.warn(EventoSeguranca.ORIGEM_BLOQUEADA)
                .addKeyValue("origem", origem == null ? "ausente" : origem)
                .addKeyValue("metodo", request.getMethod())
                .addKeyValue("path", RespostaErroJson.caminho(request))
                .log("Requisição com cookie de sessão bloqueada: origem fora da allowlist (possível CSRF)");
        RespostaErroJson.escrever(response, objectMapper, HttpServletResponse.SC_FORBIDDEN, CODIGO, MENSAGEM);
    }

    private boolean permitida(HttpServletRequest request, String origem) {
        CorsConfiguration config = corsSource.getCorsConfiguration(request);
        return config != null && config.checkOrigin(origem) != null;
    }

    /** Origin; se ausente (alguns navegadores/proxies), scheme://host[:porta] do Referer. */
    static String origemDaRequisicao(HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isBlank() && !"null".equals(origin)) {
            return origin.trim();
        }
        String referer = request.getHeader("Referer");
        if (referer == null || referer.isBlank()) return null;
        try {
            URI uri = URI.create(referer.trim());
            if (uri.getScheme() == null || uri.getHost() == null) return null;
            return uri.getScheme() + "://" + uri.getHost() + (uri.getPort() == -1 ? "" : ":" + uri.getPort());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
