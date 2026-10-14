package br.com.core4erp.empresa.dto;

import java.util.List;
import java.util.Set;

public record PermissoesUsuarioResponseDto(
    Long usuarioId,
    String usuarioEmail,
    String usuarioNome,
    String perfilNome,
    List<PermissaoUsuarioResponseDto> todasPermissoes,
    Set<String> permissoesEfetivas
) {}
