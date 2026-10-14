package br.com.core4erp.auth.dto;

public record MeResponseDto(
        Long id,
        String nome,
        String email,
        String telefone,
        String role,
        String fotoPerfil,
        String tipoConta
) {}
