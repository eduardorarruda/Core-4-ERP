package br.com.core4erp.config.security;

import br.com.core4erp.exception.ErrorResponseDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

/**
 * Escreve, a partir de um filtro, o mesmo JSON de erro do {@code GlobalExceptionHandler}
 * ({@link ErrorResponseDto}: codigo, mensagem, timestamp). Filtros rodam antes do DispatcherServlet,
 * então o advice não os alcança. Os cabeçalhos CORS já foram aplicados pelo {@code CorsFilter} do
 * Spring Security (que roda antes) — somente para origens da allowlist; nunca refletir o Origin aqui.
 */
public final class RespostaErroJson {

    private RespostaErroJson() {}

    /**
     * Caminho da requisição dentro da aplicação (servletPath + pathInfo), já normalizado pelo
     * container — usar no lugar do requestURI cru nos filtros de segurança.
     */
    public static String caminho(HttpServletRequest request) {
        String servletPath = request.getServletPath() == null ? "" : request.getServletPath();
        String pathInfo = request.getPathInfo();
        return pathInfo == null ? servletPath : servletPath + pathInfo;
    }

    public static void escrever(HttpServletResponse response, ObjectMapper mapper,
                                int status, String codigo, String mensagem) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        mapper.writeValue(response.getWriter(), new ErrorResponseDto(codigo, mensagem, LocalDateTime.now()));
    }
}
