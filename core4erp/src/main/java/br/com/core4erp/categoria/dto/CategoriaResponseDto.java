package br.com.core4erp.categoria.dto;

import br.com.core4erp.categoria.entity.Categoria;

public record CategoriaResponseDto(
        Long id,
        String descricao,
        String icone,
        Long categoriaPaiId,
        String categoriaPaiDescricao,
        boolean ativo
) {
    public static CategoriaResponseDto from(Categoria c) {
        Categoria pai = c.getCategoriaPai();
        return new CategoriaResponseDto(
                c.getId(),
                c.getDescricao(),
                c.getIcone(),
                pai != null ? pai.getId() : null,
                pai != null ? pai.getDescricao() : null,
                Boolean.TRUE.equals(c.getAtivo()));
    }
}
