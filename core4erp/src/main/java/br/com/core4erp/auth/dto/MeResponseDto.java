package br.com.core4erp.auth.dto;

public record MeResponseDto(
        Long id,
        String nome,
        String email,
        Long telefone,
        String role,
        String fotoPerfil
) {}
