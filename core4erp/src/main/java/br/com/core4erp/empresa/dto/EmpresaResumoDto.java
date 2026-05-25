package br.com.core4erp.empresa.dto;

import java.util.Set;

public record EmpresaResumoDto(
    Long id,
    String nome,
    String perfilNome,
    Set<String> permissoes
) {}
