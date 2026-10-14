package br.com.core4erp.orcamento.dto;

/** Resumo da categoria exibida no orçamento/insights. A categoria não tem cor no modelo atual. */
public record CategoriaOrcamentoDto(Long id, String descricao, String icone) {}
