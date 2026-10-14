package br.com.core4erp.empresa.dto;

import br.com.core4erp.empresa.entity.UsuarioEmpresa;

import java.time.LocalDateTime;

public record MembroResponseDto(
    Long usuarioId,
    String email,
    String nome,
    Long perfilId,
    String perfilNome,
    Boolean ativo,
    LocalDateTime dataIngresso
) {
    public static MembroResponseDto from(UsuarioEmpresa ue) {
        return new MembroResponseDto(
            ue.getUsuario().getId(),
            ue.getUsuario().getEmail(),
            ue.getUsuario().getNome(),
            ue.getPerfil().getId(),
            ue.getPerfil().getNome(),
            ue.getAtivo(),
            ue.getDataIngresso()
        );
    }
}
