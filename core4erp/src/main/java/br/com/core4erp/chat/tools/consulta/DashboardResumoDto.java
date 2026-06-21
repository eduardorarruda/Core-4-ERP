package br.com.core4erp.chat.tools.consulta;

import br.com.core4erp.dashboard.dto.DashboardResponseDto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Projeção compacta do dashboard para enviar ao modelo de IA.
 *
 * <p>O {@link DashboardResponseDto} completo é otimizado para o front-end (fluxo de 6 meses,
 * top 5 categorias, vários campos de limite). Reinjetar esse JSON inteiro no prompt a cada
 * chamada de tool infla o consumo de tokens sem ganho de qualidade. Esta projeção mantém os
 * números que importam para responder e reduz o fluxo aos 3 meses mais recentes e as 3 maiores
 * despesas — o suficiente para o assistente raciocinar, com uma fração dos tokens.
 */
public record DashboardResumoDto(
        BigDecimal saldoTotal,
        BigDecimal totalAPagar,
        BigDecimal totalAReceber,
        BigDecimal investimentos,
        BigDecimal limiteUsadoCartoes,
        BigDecimal limiteTotalCartoes,
        Long contasVencendoHoje,
        Long contasAtrasadas,
        BigDecimal gastoMensalAssinaturas,
        List<DashboardResponseDto.FluxoMensalDto> fluxoRecente,
        List<DashboardResponseDto.DespesaPorCategoriaDto> maioresDespesas
) {
    public static DashboardResumoDto from(DashboardResponseDto d) {
        List<DashboardResponseDto.FluxoMensalDto> fluxo = d.fluxoMensal() == null
                ? List.of()
                : d.fluxoMensal().stream().skip(Math.max(0, d.fluxoMensal().size() - 3)).toList();
        List<DashboardResponseDto.DespesaPorCategoriaDto> despesas = d.despesasPorCategoria() == null
                ? List.of()
                : d.despesasPorCategoria().stream().limit(3).toList();
        return new DashboardResumoDto(
                d.saldoTotalContasCorrentes(),
                d.totalAPagar(),
                d.totalAReceber(),
                d.patrimonioInvestimentos(),
                d.limiteUsadoTotalCartoes(),
                d.limiteTotalCartoes(),
                d.contasVencendoHoje(),
                d.contasAtrasadas(),
                d.totalMensalAssinaturas(),
                fluxo,
                despesas
        );
    }
}
