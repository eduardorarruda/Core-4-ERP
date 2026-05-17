package br.com.core4erp.cartaoCredito.dto;

import java.math.BigDecimal;

public record CartaoDashboardResumoDto(
        String categoriaNome,
        Integer mes,
        Integer ano,
        BigDecimal totalGasto
) {}
