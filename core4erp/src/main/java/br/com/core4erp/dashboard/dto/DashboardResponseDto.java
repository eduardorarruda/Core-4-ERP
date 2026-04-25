package br.com.core4erp.dashboard.dto;

import java.math.BigDecimal;
import java.util.List;

public record DashboardResponseDto(
        BigDecimal saldoTotalContasCorrentes,
        BigDecimal totalAPagar,
        BigDecimal totalAReceber,
        BigDecimal patrimonioInvestimentos,
        BigDecimal limiteTotalCartoes,
        BigDecimal limiteUsadoTotalCartoes,
        List<FluxoMensalDto> fluxoMensal,
        List<DespesaPorCategoriaDto> despesasPorCategoria,
        Long contasVencendoHoje,
        Long contasAtrasadas,
        BigDecimal totalMensalAssinaturas
) {
    public record FluxoMensalDto(Integer mes, Integer ano, BigDecimal totalPago, BigDecimal totalRecebido) {}
    public record DespesaPorCategoriaDto(String categoria, BigDecimal total) {}
}
