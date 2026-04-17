package br.com.core4erp.exception;

import java.time.LocalDateTime;

public record ErrorResponseDto(
        String codigo,
        String mensagem,
        LocalDateTime timestamp
) {}
