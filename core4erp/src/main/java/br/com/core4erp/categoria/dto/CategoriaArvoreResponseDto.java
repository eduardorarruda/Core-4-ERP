package br.com.core4erp.categoria.dto;

import java.util.List;

/** Categoria com suas subcategorias aninhadas (2 níveis). Usada por GET /api/categorias/arvore. */
public record CategoriaArvoreResponseDto(
        Long id,
        String descricao,
        String icone,
        boolean ativo,
        List<CategoriaArvoreResponseDto> subcategorias
) {}
