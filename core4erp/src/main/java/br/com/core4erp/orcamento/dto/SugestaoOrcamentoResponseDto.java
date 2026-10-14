package br.com.core4erp.orcamento.dto;

import java.math.BigDecimal;

/** Categoria com gasto e sem orçamento, com o limite sugerido pela média dos últimos 3 meses. */
public record SugestaoOrcamentoResponseDto(
        CategoriaOrcamentoDto categoria,
        BigDecimal gastoMes,
        BigDecimal mediaUltimos3Meses,
        BigDecimal sugestaoLimite
) {}
