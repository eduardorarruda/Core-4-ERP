package br.com.core4erp.exception;

import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
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

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponseDto> handleBusiness(BusinessException e) {
        return ResponseEntity.status(422).body(new ErrorResponseDto(
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

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponseDto> handleGeneral(Exception e) {
        log.error("[ERRO_INTERNO] Exceção não tratada — {}: {}", e.getClass().getSimpleName(), e.getMessage(), e);
        return ResponseEntity.status(500).body(new ErrorResponseDto(
                "ERRO_INTERNO", "Erro interno do servidor", LocalDateTime.now()
        ));
    }
}
