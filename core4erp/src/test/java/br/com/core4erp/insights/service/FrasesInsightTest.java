package br.com.core4erp.insights.service;

import br.com.core4erp.insights.dto.InsightsResponseDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.CategoriaForaDoNormalDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.DiaSemanaDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.FraseInsightDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.MaiorGastoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.ProjecaoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.ResumoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.RitmoDto;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class FrasesInsightTest {

    private static final YearMonth OUT = YearMonth.of(2026, 10);

    private static BigDecimal bd(String v) {
        return v == null ? null : new BigDecimal(v);
    }

    private static InsightsResponseDto dados(String mes, int dia, String total, String varAnterior, String varMedia,
                                             List<CategoriaForaDoNormalDto> fora, ProjecaoDto projecao,
                                             List<MaiorGastoDto> maiores, List<DiaSemanaDto> semana) {
        return new InsightsResponseDto(mes, null, dia, 31,
                new ResumoDto(bd(total), 3, BigDecimal.ONE, BigDecimal.ONE),
                new RitmoDto(bd(total), BigDecimal.ONE, BigDecimal.ONE, bd(varAnterior), bd(varMedia), List.of()),
                semana, fora, maiores, projecao, List.of());
    }

    private static ProjecaoDto projecao(String valor, String variacao) {
        return new ProjecaoDto(bd(valor), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, bd(variacao), false);
    }

    @Test
    void mesCorrente_frasesCompletasNaOrdem() {
        List<CategoriaForaDoNormalDto> fora = List.of(
                new CategoriaForaDoNormalDto(1L, "Alimentação", "Utensils", bd("552"), bd("400"), bd("152"),
                        bd("38.0"), bd("9.31"), "ACIMA_DO_NORMAL"),
                new CategoriaForaDoNormalDto(3L, "Viagens", "Plane", bd("450"), bd("0"), bd("450"),
                        null, null, "NOVA"));
        List<DiaSemanaDto> semana = List.of(
                new DiaSemanaDto(1, "segunda-feira", bd("100"), 1, false),
                new DiaSemanaDto(6, "sábado", bd("2310.5"), 9, true));

        List<FraseInsightDto> frases = FrasesInsight.gerar(dados("2026-10", 14, "1500", "29.4", "5", fora,
                projecao("5430", "12.2"),
                List.of(new MaiorGastoDto("Aluguel", bd("1800"), LocalDate.of(2026, 10, 5), "CONTA", "Casa", null)),
                semana), OUT);

        assertThat(frases).extracting(FraseInsightDto::texto).containsExactly(
                "Até o dia 14 você gastou 29% a mais que no mesmo ponto do mês passado.",
                "Você gastou 38% a mais com Alimentação do que na média dos últimos 3 meses.",
                "Viagens apareceu este mês: R$ 450,00.",
                "Se continuar nesse ritmo, o mês deve fechar em R$ 5.430,00 — 12% acima do mês passado.",
                "Seu maior gasto do mês foi Aluguel: R$ 1.800,00.",
                "Nos últimos 90 dias, sábado foi o dia da semana em que você mais gastou: R$ 2.310,50.");
        assertThat(frases).extracting(FraseInsightDto::tipo)
                .containsExactly("ATENCAO", "ATENCAO", "INFO", "ATENCAO", "INFO", "INFO");
    }

    @Test
    void ritmoAbaixoDoMesPassado_positivo_eVariacaoPequenaCaiNaMedia() {
        FraseInsightDto menos = FrasesInsight.fraseRitmo(
                new RitmoDto(BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE, bd("-22.6"), null, List.of()),
                OUT, 9, false).orElseThrow();
        assertThat(menos.tipo()).isEqualTo("POSITIVO");
        assertThat(menos.texto()).isEqualTo("Até o dia 9 você gastou 23% a menos que no mesmo ponto do mês passado.");

        FraseInsightDto media = FrasesInsight.fraseRitmo(
                new RitmoDto(BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE, bd("4"), bd("15"), List.of()),
                OUT, 9, false).orElseThrow();
        assertThat(media.texto()).isEqualTo("Até o dia 9 você gastou 15% a mais que a média dos últimos 3 meses no mesmo ponto.");

        assertThat(FrasesInsight.fraseRitmo(
                new RitmoDto(BigDecimal.ONE, BigDecimal.ONE, BigDecimal.ONE, bd("4"), null, List.of()),
                OUT, 9, false)).isEmpty();
    }

    @Test
    void mesEncerrado_usaNomeDosMeses_eSemProjecao() {
        List<FraseInsightDto> frases = FrasesInsight.gerar(dados("2026-09", 30, "1000", "12", null, List.of(),
                new ProjecaoDto(bd("1000"), bd("1000"), bd("33"), BigDecimal.ZERO, bd("890"), bd("12"), true),
                List.of(), List.of()), OUT);

        assertThat(frases).extracting(FraseInsightDto::texto)
                .containsExactly("Em setembro você gastou 12% a mais que em agosto.");
    }

    @Test
    void categoriaMuitoAcima_alerta() {
        FraseInsightDto f = FrasesInsight.fraseCategoria(new CategoriaForaDoNormalDto(1L, "Mercado", null,
                bd("900"), bd("500"), bd("400"), bd("80.0"), null, "ACIMA_DO_NORMAL"), OUT, false);
        assertThat(f.tipo()).isEqualTo("ALERTA");
    }

    @Test
    void semGastos_eMesFuturo() {
        assertThat(FrasesInsight.gerar(dados("2026-10", 14, "0", null, null, List.of(), projecao("0", null),
                List.of(), List.of()), OUT))
                .extracting(FraseInsightDto::texto).containsExactly("Ainda não há gastos registrados neste mês.");

        ProjecaoDto agendado = new ProjecaoDto(bd("250"), BigDecimal.ZERO, BigDecimal.ZERO, bd("250"),
                BigDecimal.ZERO, null, false);
        assertThat(FrasesInsight.gerar(dados("2026-11", 0, "0", null, null, List.of(), agendado,
                List.of(), List.of()), OUT))
                .extracting(FraseInsightDto::texto)
                .containsExactly("Este mês ainda não começou. Já há R$ 250,00 em contas agendadas.");
    }
}
