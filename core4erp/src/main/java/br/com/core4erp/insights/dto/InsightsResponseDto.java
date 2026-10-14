package br.com.core4erp.insights.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Leituras do mês (tela /insights). Todos os valores são GASTO conforme a definição única de
 * {@code GastoRepository} (contas a pagar + cartão, sem duplicar a fatura, com roll-up de subcategorias).
 *
 * @param mes             "AAAA-MM"
 * @param dataReferencia  "hoje" do cálculo (último dia em mês passado; null em mês futuro)
 * @param diaReferencia   dia do mês correspondente (0 em mês futuro)
 */
public record InsightsResponseDto(
        String mes,
        LocalDate dataReferencia,
        int diaReferencia,
        int diasNoMes,
        ResumoDto resumo,
        RitmoDto ritmo,
        List<DiaSemanaDto> gastoPorDiaDaSemana,
        List<CategoriaForaDoNormalDto> categoriasForaDoNormal,
        List<MaiorGastoDto> maioresGastos,
        ProjecaoDto projecao,
        List<FraseInsightDto> frases
) {

    /** Cópia com as frases geradas a partir dos próprios números. */
    public InsightsResponseDto comFrases(List<FraseInsightDto> novasFrases) {
        return new InsightsResponseDto(mes, dataReferencia, diaReferencia, diasNoMes, resumo, ritmo,
                gastoPorDiaDaSemana, categoriasForaDoNormal, maioresGastos, projecao, List.copyOf(novasFrases));
    }

    /** KPIs até a data de referência. */
    public record ResumoDto(BigDecimal totalAteHoje, long quantidade, BigDecimal ticketMedio, BigDecimal mediaDiaria) {}

    /**
     * Ritmo do mês: gasto acumulado até o dia de referência comparado ao mesmo ponto do mês anterior e à
     * média do mesmo ponto nos 3 meses anteriores. Variações em % (null quando a base é zero).
     */
    public record RitmoDto(BigDecimal gastoAteHoje,
                           BigDecimal mesmoPeriodoMesAnterior,
                           BigDecimal mediaMesmoPeriodo3Meses,
                           BigDecimal variacaoVsMesAnterior,
                           BigDecimal variacaoVsMedia3Meses,
                           List<PontoRitmoDto> curva) {}

    /** Acumulado dia a dia ({@code atual} é null depois do dia de referência). */
    public record PontoRitmoDto(int dia, BigDecimal atual, BigDecimal mesAnterior, BigDecimal media3Meses) {}

    /** ISO: 1 = segunda … 7 = domingo. Janela: 90 dias terminando na data de referência. */
    public record DiaSemanaDto(int diaSemana, String nome, BigDecimal total, long quantidade, boolean maior) {}

    /**
     * Categoria acima do normal. {@code tipo}: ACIMA_DO_NORMAL (gasto ≥ 20% e ≥ R$ 50 acima da média dos
     * 3 meses anteriores) ou NOVA (sem gasto nos 3 meses anteriores e ≥ R$ 50 no mês).
     */
    public record CategoriaForaDoNormalDto(Long categoriaId, String descricao, String icone,
                                           BigDecimal atual, BigDecimal media3Meses, BigDecimal diferenca,
                                           BigDecimal variacaoPercentual, BigDecimal zScore, String tipo) {}

    /** {@code origem}: CONTA (conta a pagar) ou CARTAO (lançamento/parcela de cartão). */
    public record MaiorGastoDto(String descricao, BigDecimal valor, LocalDate data, String origem,
                                String categoria, String parceiro) {}

    /**
     * Projeção de fechamento. Mês corrente: gastoAteHoje + agendadoRestante (contas com vencimento depois de
     * hoje no mês) + ritmoDiario × dias restantes, onde ritmoDiario = gasto no CARTÃO até hoje / dia (gasto
     * variável — contas fixas não são extrapoladas). Mês passado: o total real (ritmoDiario = total/dias).
     * Mês futuro: o já agendado.
     */
    public record ProjecaoDto(BigDecimal valorProjetado, BigDecimal gastoAteHoje, BigDecimal ritmoDiario,
                              BigDecimal agendadoRestante, BigDecimal totalMesAnterior,
                              BigDecimal variacaoVsMesAnterior, boolean mesEncerrado) {}

    /** Frase pronta para exibir. {@code tipo}: ALERTA | ATENCAO | POSITIVO | INFO. */
    public record FraseInsightDto(String tipo, String texto) {}
}
