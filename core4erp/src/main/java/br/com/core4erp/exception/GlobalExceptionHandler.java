package br.com.core4erp.exception;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.retry.NonTransientAiException;
import org.springframework.ai.retry.TransientAiException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /** Teto do texto de erro de serviços externos registrado em log (sem corpo completo). */
    static final int MAX_DETALHE_UPSTREAM = 300;
    private static final ObjectMapper JSON = new ObjectMapper();

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponseDto> handleNotFound(EntityNotFoundException e) {
        return ResponseEntity.status(404).body(new ErrorResponseDto(
                "RECURSO_NAO_ENCONTRADO", e.getMessage(), LocalDateTime.now()
        ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponseDto> handleDataIntegrity(DataIntegrityViolationException e) {
        // Só o tipo da causa raiz no log — a mensagem do driver pode conter valores da linha.
        Throwable raiz = e.getMostSpecificCause();
        log.warn("[INTEGRIDADE] violação de restrição no banco — causa={}", raiz.getClass().getSimpleName());
        return ResponseEntity.status(400).body(new ErrorResponseDto(
                "VIOLACAO_INTEGRIDADE",
                "Já existe um registro com esses dados ou ele está sendo usado em outro lugar. "
                        + "Verifique as informações e tente novamente.",
                LocalDateTime.now()
        ));
    }

    // Anexo/parâmetro de formulário ausente ou upload malformado (ex.: POST /api/chat/anexo
    // sem o arquivo) → 400 amigável, não 500.
    @ExceptionHandler({
            MissingServletRequestPartException.class,
            MultipartException.class
    })
    public ResponseEntity<ErrorResponseDto> handleMissingPart(Exception e) {
        return ResponseEntity.status(400).body(new ErrorResponseDto(
                "REQUISICAO_INVALIDA",
                "Nenhum arquivo válido foi enviado. Selecione um arquivo e tente novamente.",
                LocalDateTime.now()
        ));
    }

    // Corpo ausente ou JSON malformado/tipo incompatível → 400 (erro do cliente, não 500 + ERROR).
    // Só o tipo da causa no log: a mensagem do Jackson pode ecoar trechos do corpo enviado.
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponseDto> handleCorpoIlegivel(HttpMessageNotReadableException e) {
        Throwable causa = e.getMostSpecificCause();
        log.warn("[REQUISICAO_INVALIDA] corpo ausente ou malformado — causa={}", causa.getClass().getSimpleName());
        return erro(HttpStatus.BAD_REQUEST, "REQUISICAO_INVALIDA",
                "Os dados enviados estão incompletos ou em formato inválido. Verifique e tente novamente.");
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponseDto> handleParametroAusente(MissingServletRequestParameterException e) {
        log.warn("[REQUISICAO_INVALIDA] parâmetro obrigatório ausente — {}", e.getParameterName());
        return erro(HttpStatus.BAD_REQUEST, "REQUISICAO_INVALIDA",
                "Está faltando uma informação obrigatória. Verifique os dados e tente novamente.");
    }

    // Ex.: /api/contas/abc (id não numérico) ou enum inexistente em parâmetro → 400, não 500.
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponseDto> handleTipoInvalido(MethodArgumentTypeMismatchException e) {
        log.warn("[REQUISICAO_INVALIDA] valor inválido para o parâmetro — {}", e.getName());
        return erro(HttpStatus.BAD_REQUEST, "REQUISICAO_INVALIDA",
                "Um dos valores informados é inválido. Verifique os dados e tente novamente.");
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ErrorResponseDto> handleMetodoNaoSuportado(HttpRequestMethodNotSupportedException e) {
        log.warn("[METODO_NAO_SUPORTADO] método {} não suportado", e.getMethod());
        ResponseEntity.BodyBuilder resposta = ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED);
        if (e.getSupportedHttpMethods() != null) {
            resposta.allow(e.getSupportedHttpMethods().toArray(new HttpMethod[0]));
        }
        return resposta.body(new ErrorResponseDto("METODO_NAO_SUPORTADO",
                "Esta operação não está disponível neste endereço.", LocalDateTime.now()));
    }

    // Rota inexistente → 404 JSON (sem isto caía no handler genérico como 500 + ERROR).
    @ExceptionHandler({NoResourceFoundException.class, NoHandlerFoundException.class})
    public ResponseEntity<ErrorResponseDto> handleRotaInexistente(Exception e) {
        return erro(HttpStatus.NOT_FOUND, "RECURSO_NAO_ENCONTRADO", "Recurso não encontrado.");
    }

    private static ResponseEntity<ErrorResponseDto> erro(HttpStatus status, String codigo, String mensagem) {
        return ResponseEntity.status(status).body(new ErrorResponseDto(codigo, mensagem, LocalDateTime.now()));
    }

    // Content-Type não suportado pelo endpoint → 415 (mensagem neutra, vale p/ upload e JSON).
    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ErrorResponseDto> handleMediaType(HttpMediaTypeNotSupportedException e) {
        return ResponseEntity.status(415).body(new ErrorResponseDto(
                "FORMATO_NAO_SUPORTADO",
                "Formato de requisição não suportado para esta operação.",
                LocalDateTime.now()
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponseDto> handleValidation(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.status(422).body(new ErrorResponseDto(
                "VALIDACAO_INVALIDA", message, LocalDateTime.now()
        ));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponseDto> handleAccessDenied(AccessDeniedException e) {
        return ResponseEntity.status(403).body(new ErrorResponseDto(
                "ACESSO_NEGADO", "Sem permissão para acessar este recurso", LocalDateTime.now()
        ));
    }

    @ExceptionHandler(AcessoNegadoException.class)
    public ResponseEntity<ErrorResponseDto> handleAcessoNegado(AcessoNegadoException e) {
        log.warn("Acesso negado: {}", e.getMessage());
        return ResponseEntity.status(403).body(new ErrorResponseDto(
                "ACESSO_NEGADO", e.getMessage(), LocalDateTime.now()
        ));
    }

    // S.12: conflito de concorrência no saldo (lock otimista @Version) — peça para repetir a operação
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponseDto> handleOptimisticLock(ObjectOptimisticLockingFailureException e) {
        log.warn("Conflito de concorrência: {}", e.getMessage());
        return ResponseEntity.status(409).body(new ErrorResponseDto(
                "CONFLITO_CONCORRENCIA",
                "Este registro foi alterado por outra operação ao mesmo tempo. Tente novamente.",
                LocalDateTime.now()
        ));
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponseDto> handleBusiness(BusinessException e) {
        int status = switch (e.getCode()) {
            case "CONVITE_PENDENTE", "USUARIO_JA_MEMBRO", "REGISTRO_EM_USO", "ORCAMENTO_JA_EXISTE" -> 409;
            case "LIMITE_PLANO", "OPERACAO_INVALIDA", "CONVITE_EXPIRADO" -> 422;
            case "PLANO_INATIVO", "SENHA_INCORRETA" -> 400;
            default -> 422;
        };
        log.warn("Regra de negócio violada: {} — {}", e.getCode(), e.getMessage());
        return ResponseEntity.status(status).body(new ErrorResponseDto(
                e.getCode(), e.getMessage(), LocalDateTime.now()
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponseDto> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(400).body(new ErrorResponseDto(
                "REQUISICAO_INVALIDA", e.getMessage(), LocalDateTime.now()
        ));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<ErrorResponseDto> handleIllegalState(IllegalStateException e) {
        return ResponseEntity.status(400).body(new ErrorResponseDto(
                "ESTADO_INVALIDO", e.getMessage(), LocalDateTime.now()
        ));
    }

    @ExceptionHandler(LockedException.class)
    public ResponseEntity<ErrorResponseDto> handleLocked(LockedException e) {
        return ResponseEntity.status(423).body(new ErrorResponseDto(
                "CONTA_BLOQUEADA", e.getMessage(), LocalDateTime.now()
        ));
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ErrorResponseDto> handleAuthentication(AuthenticationException e) {
        return ResponseEntity.status(401).body(new ErrorResponseDto(
                "CREDENCIAIS_INVALIDAS", e.getMessage(), LocalDateTime.now()
        ));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponseDto> handleResponseStatus(ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(new ErrorResponseDto(
                "ERRO_HTTP", e.getReason() != null ? e.getReason() : e.getMessage(), LocalDateTime.now()
        ));
    }

    @ExceptionHandler(WebClientResponseException.class)
    public ResponseEntity<ErrorResponseDto> handleWebClient(WebClientResponseException e) {
        // Falha em chamada a serviço externo (ex.: OpenAI). Loga só status + host/path +
        // error.type/error.code/error.message (truncada) — o corpo completo pode ecoar o prompt
        // (dados financeiros do usuário) e nunca vai para o log nem para o cliente.
        log.error("[ERRO_UPSTREAM] status={} destino={} — {}",
                e.getStatusCode().value(),
                e.getRequest() != null ? e.getRequest().getURI().getHost() + e.getRequest().getURI().getPath() : "?",
                resumirErroUpstream(e.getResponseBodyAsString()));
        return ResponseEntity.status(502).body(new ErrorResponseDto(
                "ERRO_SERVICO_EXTERNO",
                "O assistente está temporariamente indisponível. Tente novamente em instantes.",
                LocalDateTime.now()
        ));
    }

    // Erros da OpenAI/Spring AI (ex.: 429 limite de tokens/min, indisponibilidade) → 503 amigável,
    // nunca 500 genérico (CLAUDE.md §21). Detecta rate limit para orientar o usuário a aguardar.
    @ExceptionHandler({NonTransientAiException.class, TransientAiException.class})
    public ResponseEntity<ErrorResponseDto> handleAi(Exception e) {
        String m = e.getMessage() != null ? e.getMessage() : "";
        boolean rate = m.contains("429") || m.contains("rate_limit") || m.contains("Rate limit");
        log.error("[ERRO_IA] {} — rate={} — {}", e.getClass().getSimpleName(), rate,
                m.length() > 300 ? m.substring(0, 300) : m);
        String msg = rate
                ? "O assistente recebeu muitas solicitações em pouco tempo. Aguarde alguns segundos e tente novamente."
                : "O assistente está temporariamente indisponível. Tente novamente em instantes.";
        return ResponseEntity.status(503).body(new ErrorResponseDto(
                "ERRO_SERVICO_EXTERNO", msg, LocalDateTime.now()));
    }

    /**
     * Resume o corpo de erro de um serviço externo para log: no formato OpenAI
     * ({@code {"error":{"type","code","message"}}}) devolve só esses campos; caso contrário, o texto
     * truncado. Sempre limitado a {@link #MAX_DETALHE_UPSTREAM} caracteres.
     */
    static String resumirErroUpstream(String corpo) {
        if (corpo == null || corpo.isBlank()) {
            return "(sem corpo)";
        }
        String resumo;
        try {
            JsonNode erro = JSON.readTree(corpo).path("error");
            if (erro.isObject()) {
                resumo = "type=" + erro.path("type").asText("") + " code=" + erro.path("code").asText("")
                        + " message=" + erro.path("message").asText("");
            } else {
                resumo = corpo;
            }
        } catch (Exception naoJson) {
            resumo = corpo; // corpo não-JSON (HTML de proxy, texto) — só truncado
        }
        return resumo.length() > MAX_DETALHE_UPSTREAM ? resumo.substring(0, MAX_DETALHE_UPSTREAM) + "…" : resumo;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDto> handleGeneral(Exception e) {
        log.error("[ERRO_INTERNO] Exceção não tratada — {}: {}", e.getClass().getSimpleName(), e.getMessage(), e);
        return ResponseEntity.status(500).body(new ErrorResponseDto(
                "ERRO_INTERNO", "Erro interno do servidor", LocalDateTime.now()
        ));
    }
}
