package br.com.core4erp.categoria.dto;

import br.com.core4erp.categoria.entity.Categoria;

public record CategoriaResponseDto(
        Long id,
        String descricao,
        String icone
) {
    public static CategoriaResponseDto from(Categoria c) {
        return new CategoriaResponseDto(c.getId(), c.getDescricao(), c.getIcone());
    }
}
