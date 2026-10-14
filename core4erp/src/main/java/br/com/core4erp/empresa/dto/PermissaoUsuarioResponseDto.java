package br.com.core4erp.empresa.dto;

import java.time.LocalDateTime;

public record PermissaoUsuarioResponseDto(
    Long id,
    String codigo,
    String modulo,
    String acao,
    String descricao,
    String origem,
    Boolean revogada,
    String concedidaPorEmail,
    LocalDateTime dataConcessao,
    String observacao
) {}
