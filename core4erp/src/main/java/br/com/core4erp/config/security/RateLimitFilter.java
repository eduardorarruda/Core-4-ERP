package br.com.core4erp.config.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
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
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Rate limit por IP (Bucket4j em memória).
 *
 * <ul>
 *   <li>login/registro: 10/min por IP;</li>
 *   <li>rotas sensíveis de conta (esqueci/redefinir senha, convite, trocar senha, excluir conta,
 *       criar empresa):
 *       5 a cada 15 min por IP <b>e por rota</b> — freia força bruta de token/senha e abuso de envio
 *       de e-mail;</li>
 *   <li>chat IA: 30/min por usuário (ou IP); upload OFX: 10/h por IP.</li>
 * </ul>
 *
 * <p>O IP vem do {@link ClientIpResolver} (nunca do X-Forwarded-For mais à esquerda).
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

    private static final int AUTH_CAPACIDADE = 10;
    private static final int SENSIVEL_CAPACIDADE = 5;
    private static final Duration SENSIVEL_JANELA = Duration.ofMinutes(15);
    private static final int CHAT_CAPACIDADE = 30;
    private static final int UPLOAD_CAPACIDADE = 10;
    private static final long MAX_ENTRADAS = 5_000;

    private enum Grupo { AUTH, SENSIVEL, CHAT, UPLOAD }

    private final Cache<String, Bucket> buckets;
    private final Cache<String, Bucket> sensiveisBuckets;
    private final Cache<String, Bucket> chatBuckets;
    private final Cache<String, Bucket> uploadBuckets;
    private final ObjectMapper objectMapper;
    private final JwtService jwtService;
    private final ClientIpResolver clientIpResolver;

    public RateLimitFilter(ObjectMapper objectMapper, JwtService jwtService, ClientIpResolver clientIpResolver) {
        this.objectMapper = objectMapper;
        this.jwtService = jwtService;
        this.clientIpResolver = clientIpResolver;
        this.buckets = novoCache(Duration.ofMinutes(10));
        this.sensiveisBuckets = novoCache(Duration.ofMinutes(30));
        this.chatBuckets = novoCache(Duration.ofMinutes(10));
        this.uploadBuckets = novoCache(Duration.ofHours(2));
    }

    private static Cache<String, Bucket> novoCache(Duration expiraAposAcesso) {
        return Caffeine.newBuilder()
                .expireAfterAccess(expiraAposAcesso.toMinutes(), TimeUnit.MINUTES)
                .maximumSize(MAX_ENTRADAS)
                .build();
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return classificar(request) == null;
    }

    /** Grupo de rate limit da requisição, ou {@code null} se a rota não é limitada. */
    private Grupo classificar(HttpServletRequest request) {
        String path = RespostaErroJson.caminho(request);
        String metodo = request.getMethod();
        if (path.equals("/api/auth/login") || path.equals("/api/auth/registrar")) return Grupo.AUTH;
        if (rotaSensivel(path, metodo) != null) return Grupo.SENSIVEL;
        if (isChatAiCall(request)) return Grupo.CHAT;
        if (path.equals("/api/conciliacao/upload")) return Grupo.UPLOAD;
        return null;
    }

    /** Nome lógico da rota sensível (usado na chave do bucket) ou {@code null}. */
    static String rotaSensivel(String path, String metodo) {
        if (path.equals("/api/auth/esqueci-senha")) return "esqueci-senha";
        if (path.equals("/api/auth/redefinir-senha")) return "redefinir-senha";
        if (path.equals("/api/auth/aceitar-convite")) return "aceitar-convite";
        if (path.startsWith("/api/auth/convite/")) return "convite";
        if (path.equals("/api/auth/senha")) return "senha";
        if (path.equals("/api/auth/me") && "DELETE".equalsIgnoreCase(metodo)) return "excluir-conta";
        if (path.equals("/api/empresas") && "POST".equalsIgnoreCase(metodo)) return "criar-empresa";
        return null;
    }

    /**
     * Só as chamadas de IA (caras) contam no rate limit do chat — NÃO o clear de histórico
     * (DELETE /api/chat/historico) nem o download de relatório (GET /api/chat/relatorios/...).
     */
    private boolean isChatAiCall(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) return false;
        String path = RespostaErroJson.caminho(request);
        return path.equals("/api/chat") || path.equals("/api/chat/stream")
                || path.equals("/api/chat/anexo") || path.equals("/api/chat/rag/indexar");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String ip = clientIpResolver.resolver(request);
        Grupo grupo = classificar(request);
        if (grupo == null) {
            chain.doFilter(request, response);
            return;
        }
        Bucket bucket = switch (grupo) {
            case AUTH -> buckets.get(ip, k -> bucket(AUTH_CAPACIDADE, Duration.ofMinutes(1)));
            case SENSIVEL -> sensiveisBuckets.get(
                    ip + "|" + rotaSensivel(RespostaErroJson.caminho(request), request.getMethod()),
                    k -> bucket(SENSIVEL_CAPACIDADE, SENSIVEL_JANELA));
            case CHAT -> chatBuckets.get(resolveChatKey(request, ip),
                    k -> bucket(CHAT_CAPACIDADE, Duration.ofMinutes(1)));
            case UPLOAD -> uploadBuckets.get(ip, k -> bucket(UPLOAD_CAPACIDADE, Duration.ofHours(1)));
        };

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
            return;
        }
        EventoSeguranca.warn(EventoSeguranca.RATE_LIMIT)
                .addKeyValue("grupo", grupo.name())
                .addKeyValue("path", RespostaErroJson.caminho(request))
                .log("Limite de requisições excedido");
        escrever429(response, mensagem(grupo));
    }

    private static String mensagem(Grupo grupo) {
        return switch (grupo) {
            case CHAT -> "Limite de mensagens atingido. Aguarde 1 minuto.";
            case UPLOAD -> "Limite de uploads atingido. Aguarde 1 hora.";
            case SENSIVEL -> "Muitas tentativas. Aguarde 15 minutos e tente novamente.";
            case AUTH -> "Muitas tentativas. Aguarde 1 minuto.";
        };
    }

    private void escrever429(HttpServletResponse response, String msg) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        // Mesmo formato do GlobalExceptionHandler (codigo/mensagem/timestamp); "erro" mantido por
        // compatibilidade com clientes antigos. Cabeçalhos CORS já vêm do CorsFilter (allowlist).
        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("codigo", "MUITAS_TENTATIVAS");
        corpo.put("mensagem", msg);
        corpo.put("erro", msg);
        corpo.put("timestamp", LocalDateTime.now().toString());
        objectMapper.writeValue(response.getWriter(), corpo);
    }

    private static Bucket bucket(int capacidade, Duration janela) {
        return Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(capacidade)
                        .refillIntervally(capacidade, janela)
                        .build())
                .build();
    }

    /**
     * Chave do rate limit do chat: e-mail do usuário autenticado (do JWT) quando disponível,
     * caso contrário o IP. Resolve o token diretamente porque este filtro roda antes do
     * {@code JwtFilter}, então o {@code SecurityContext} ainda não está populado.
     */
    private String resolveChatKey(HttpServletRequest request, String ip) {
        String token = JwtFilter.extrairCookie(request);
        if (token == null) token = JwtFilter.extrairBearer(request);
        String email = jwtService.extractEmail(token);
        return (email != null && !email.isBlank()) ? "user:" + email : "ip:" + ip;
    }
}
