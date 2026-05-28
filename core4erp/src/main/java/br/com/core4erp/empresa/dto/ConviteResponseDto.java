package br.com.core4erp.empresa.dto;

import java.time.LocalDateTime;

public record ConviteResponseDto(
    Long id,
    String emailConvidado,
    String perfilNome,
    LocalDateTime expiraEm,
    Boolean aceito,
    String convidadoPorEmail
) {}
