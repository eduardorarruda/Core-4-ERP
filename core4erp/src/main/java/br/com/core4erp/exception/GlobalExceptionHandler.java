package br.com.core4erp.exception;

import br.com.core4erp.exception.AcessoNegadoException;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponseDto> handleNotFound(EntityNotFoundException e) {
        return ResponseEntity.status(404).body(new ErrorResponseDto(
                "RECURSO_NAO_ENCONTRADO", e.getMessage(), LocalDateTime.now()
        ));
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErrorResponseDto> handleDataIntegrity(DataIntegrityViolationException e) {
        return ResponseEntity.status(400).body(new ErrorResponseDto(
                "VIOLACAO_INTEGRIDADE",
                "Operação viola restrições de integridade — verifique se o registro está em uso",
                LocalDateTime.now()
        ));
    }

    // Anexo/parâmetro de formulário ausente ou upload malformado (ex.: POST /api/chat/anexo
    // sem o arquivo) → 400 amigável, não 500.
    @ExceptionHandler({
            MissingServletRequestPartException.class,
            MissingServletRequestParameterException.class,
            MultipartException.class
    })
    public ResponseEntity<ErrorResponseDto> handleMissingPart(Exception e) {
        return ResponseEntity.status(400).body(new ErrorResponseDto(
                "REQUISICAO_INVALIDA",
                "Nenhum arquivo válido foi enviado. Selecione um arquivo e tente novamente.",
                LocalDateTime.now()
        ));
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
            case "CONVITE_PENDENTE", "USUARIO_JA_MEMBRO", "REGISTRO_EM_USO" -> 409;
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
        // Falha em chamada a serviço externo (ex.: OpenAI). Loga o corpo da resposta,
        // que contém o motivo exato (ex.: schema de função inválido), sem expô-lo ao cliente.
        log.error("[ERRO_UPSTREAM] {} de {} — corpo: {}",
                e.getStatusCode(), e.getRequest() != null ? e.getRequest().getURI() : "?",
                e.getResponseBodyAsString());
        return ResponseEntity.status(502).body(new ErrorResponseDto(
                "ERRO_SERVICO_EXTERNO",
                "O assistente está temporariamente indisponível. Tente novamente em instantes.",
                LocalDateTime.now()
        ));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDto> handleGeneral(Exception e) {
        log.error("[ERRO_INTERNO] Exceção não tratada — {}: {}", e.getClass().getSimpleName(), e.getMessage(), e);
        return ResponseEntity.status(500).body(new ErrorResponseDto(
                "ERRO_INTERNO", "Erro interno do servidor", LocalDateTime.now()
        ));
    }
}
