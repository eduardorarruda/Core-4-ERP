package br.com.core4erp.config.web;

import br.com.core4erp.exception.ErrorResponseDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.DefaultCorsProcessor;
import org.springframework.web.filter.CorsFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

/**
 * Mesmas regras do {@link DefaultCorsProcessor}, mas a recusa (origem fora da allowlist do
 * {@code CORS_ORIGINS}) responde o JSON de erro padrão ({@link ErrorResponseDto}) com 403, em vez do
 * texto puro "Invalid CORS request" do Spring.
 */
public class CorsProcessorJson extends DefaultCorsProcessor {

    static final String CODIGO = "ORIGEM_NAO_PERMITIDA";
    // Mesmo código/mensagem do OrigemRequisicaoFilter (front trata igual).
    static final String MENSAGEM = "Requisição bloqueada por segurança. Recarregue a página e tente novamente.";

    private final ObjectMapper mapper;

    public CorsProcessorJson(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    /** {@link CorsFilter} do Spring Security com este processador. */
    public static CorsFilter filtro(CorsConfigurationSource source, ObjectMapper mapper) {
        CorsFilter filtro = new CorsFilter(source);
        filtro.setCorsProcessor(new CorsProcessorJson(mapper));
        return filtro;
    }

    @Override
    protected void rejectRequest(ServerHttpResponse response) throws IOException {
        response.setStatusCode(HttpStatus.FORBIDDEN);
        response.getHeaders().setContentType(new MediaType(MediaType.APPLICATION_JSON, StandardCharsets.UTF_8));
        response.getBody().write(mapper.writeValueAsBytes(new ErrorResponseDto(CODIGO, MENSAGEM, LocalDateTime.now())));
        response.flush();
    }
}
