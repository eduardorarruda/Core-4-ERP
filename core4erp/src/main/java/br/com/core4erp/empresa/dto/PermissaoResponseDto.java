package br.com.core4erp.empresa.dto;

public record PermissaoResponseDto(
        Long id,
        String codigo,
        String modulo,
        String acao,
        String descricao
) {}
