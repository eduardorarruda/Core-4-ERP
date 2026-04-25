package br.com.core4erp.dashboard.dto;

import java.math.BigDecimal;

public record SaldoDetalhadoResponseDto(
        BigDecimal saldoContasCorrentes,
        BigDecimal totalPago,
        BigDecimal totalRecebido,
        BigDecimal totalAportado,
        BigDecimal totalResgatado,
        BigDecimal totalAPagar,
        BigDecimal totalAReceber,
        BigDecimal saldoLiquidoEmAberto,
        BigDecimal totalLancamentosCartaoAberto,
        BigDecimal totalFaturasCartaoPendentes,
        BigDecimal saldoPrevisto,
        BigDecimal saldoPrevistoComCartao,
        BigDecimal patrimonioInvestimentos
) {}
