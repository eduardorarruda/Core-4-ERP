package br.com.core4erp.auth.dto;

import java.util.Set;

public record PermissoesAtuaisResponseDto(
        Set<String> permissoes,
        String perfilNome
) {}
