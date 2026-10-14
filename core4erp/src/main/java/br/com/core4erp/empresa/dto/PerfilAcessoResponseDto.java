package br.com.core4erp.empresa.dto;

import java.util.Set;

public record PerfilAcessoResponseDto(
        Long id,
        String nome,
        String descricao,
        Set<String> permissoes,
        boolean protegido
) {}
