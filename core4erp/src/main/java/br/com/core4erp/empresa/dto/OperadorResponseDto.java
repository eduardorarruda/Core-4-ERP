package br.com.core4erp.empresa.dto;

import java.time.LocalDateTime;
import java.util.Set;

public record OperadorResponseDto(
    Long usuarioId,
    String nome,
    String email,
    String perfilNome,
    Set<String> permissoesEfetivas,
    Boolean ativo,
    Boolean senhaProvisoria,
    LocalDateTime dataIngresso
) {}
