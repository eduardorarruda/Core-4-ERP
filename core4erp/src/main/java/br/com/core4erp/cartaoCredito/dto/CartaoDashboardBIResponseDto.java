package br.com.core4erp.cartaoCredito.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public record CartaoDashboardBIResponseDto(
        List<EvolucaoMensalDto>      evolucaoMensal,
        List<DistribuicaoLimiteDto>  distribuicaoLimite,
        List<GastoPorParceiroDto>    gastosPorParceiro,
        List<ProximaFaturaDto>       proximasFaturas,
        ProjecaoMesDto               projecaoMes,
        List<ImpactoParcelamentoDto> impactoParcelamentos,
        AssinaturaVsAvulsoDto        assinaturasVsAvulsos,
        List<AlertaFechamentoDto>    alertasFechamento
) {
    public record EvolucaoMensalDto(int mes, int ano, BigDecimal totalLiquido) {}
    public record DistribuicaoLimiteDto(String nomeCartao, BigDecimal limite) {}
    public record GastoPorParceiroDto(String nomeParceiro, BigDecimal total) {}
    public record ProximaFaturaDto(
            String nomeCartao,
            BigDecimal valorAcumulado,
            LocalDate dataVencimento,
            long diasRestantes
    ) {}
    public record ProjecaoMesDto(
            BigDecimal totalAcumulado,
            BigDecimal mediaDiaria,
            BigDecimal projecaoFinal,
            int diasDecorridos,
            int diasRestantes
    ) {}
    public record ImpactoParcelamentoDto(int mes, int ano, BigDecimal totalComprometido, long qtdParcelas) {}
    public record AssinaturaVsAvulsoDto(BigDecimal totalAssinaturas, BigDecimal totalAvulsos) {}
    public record AlertaFechamentoDto(Long cartaoId, String nomeCartao, int diaFechamento, long diasRestantes) {}
}
