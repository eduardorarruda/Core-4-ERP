package br.com.core4erp.config.security;

import br.com.core4erp.config.security.SessaoUsuarioService.SessaoUsuario;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Bloqueia o uso da API por quem entrou com <b>senha provisória</b> até a troca da senha.
 *
 * <p>Roda depois do JwtFilter/TenantFilter. Para usuário autenticado com
 * {@code senhaProvisoria=true}, toda rota {@code /api/**} responde 403
 * {@code {"codigo":"SENHA_PROVISORIA", ...}} — exceto as necessárias para o próprio fluxo de troca
 * (o front abre o modal e envia o usuário a /configuracoes, que chama {@code GET /api/auth/me},
 * o polling {@code GET /api/auth/me/permissoes} e {@code PATCH /api/auth/senha}).
 *
 * <p>Não é um bean (instanciado no {@code SecurityConfig}) para não ser registrado também como
 * filtro de servlet fora da cadeia de segurança.
 */
public class SenhaProvisoriaFilter extends OncePerRequestFilter {

    public static final String CODIGO = "SENHA_PROVISORIA";
    public static final String MENSAGEM = "Troque sua senha provisória para continuar";

    static final Set<String> ROTAS_LIBERADAS = Set.of(
            "/api/auth/me",
            "/api/auth/me/permissoes",
            "/api/auth/senha",
            "/api/auth/logout",
            "/api/auth/trocar-empresa");

    private final ObjectMapper objectMapper;

    public SenhaProvisoriaFilter(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = RespostaErroJson.caminho(request);
        return !path.startsWith("/api/") || ROTAS_LIBERADAS.contains(path)
                || "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        Object attr = request.getAttribute(SessaoUsuarioService.ATRIBUTO_REQUEST);
        if (attr instanceof SessaoUsuario s && s.senhaProvisoria()) {
            EventoSeguranca.info(EventoSeguranca.SENHA_PROVISORIA_BLOQUEIO)
                    .addKeyValue("usuarioId", s.id())
                    .addKeyValue("path", RespostaErroJson.caminho(request))
                    .log("Requisição bloqueada: usuário com senha provisória");
            RespostaErroJson.escrever(response, objectMapper, HttpServletResponse.SC_FORBIDDEN, CODIGO, MENSAGEM);
            return;
        }
        chain.doFilter(request, response);
    }
}
