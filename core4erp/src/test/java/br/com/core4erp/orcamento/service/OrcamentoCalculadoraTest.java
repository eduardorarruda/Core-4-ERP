package br.com.core4erp.orcamento.service;

import br.com.core4erp.orcamento.enums.StatusOrcamento;
import br.com.core4erp.orcamento.repository.GastoRepository.GastoCategoriaMes;
import br.com.core4erp.orcamento.service.OrcamentoCalculadora.HistoricoCategoria;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class OrcamentoCalculadoraTest {

    private static final YearMonth OUTUBRO = YearMonth.of(2026, 10);
    private static final LocalDate DIA_15_OUT = LocalDate.of(2026, 10, 15);

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }

    @Test
    @DisplayName("ritmo: dia/dias no mês corrente, 100 no passado e 0 no futuro")
    void ritmoPercentual() {
        assertThat(OrcamentoCalculadora.ritmoPercentual(OUTUBRO, DIA_15_OUT)).isEqualByComparingTo("48.39");
        assertThat(OrcamentoCalculadora.ritmoPercentual(YearMonth.of(2026, 9), DIA_15_OUT)).isEqualByComparingTo("100");
        assertThat(OrcamentoCalculadora.ritmoPercentual(YearMonth.of(2026, 11), DIA_15_OUT)).isEqualByComparingTo("0");
    }

    @Test
    void percentual_eLimiteInvalido() {
        assertThat(OrcamentoCalculadora.percentual(bd("450"), bd("600"))).isEqualByComparingTo("75.00");
        assertThat(OrcamentoCalculadora.percentual(bd("900"), bd("600"))).isEqualByComparingTo("150.00");
        assertThat(OrcamentoCalculadora.percentual(bd("10"), BigDecimal.ZERO)).isEqualByComparingTo("0");
    }

    @ParameterizedTest(name = "gasto {0} (realizado {1}) / limite 600 no dia 15/10 → {2}")
    @CsvSource({
            "250.00, 250.00, OK",          // esperado até hoje = 290.32
            "300.00, 300.00, ATENCAO",     // realizado acima do ritmo, abaixo do limite
            "600.00, 600.00, ATENCAO",     // exatamente no limite ainda não estourou
            "600.01, 100.00, ESTOURADO",   // agendado já passa do limite
            "550.00, 120.00, OK"           // conta agendada p/ depois de hoje não dispara ATENCAO
    })
    void status_mesCorrente(BigDecimal gasto, BigDecimal realizado, StatusOrcamento esperado) {
        assertThat(OrcamentoCalculadora.status(gasto, realizado, bd("600"), OUTUBRO, DIA_15_OUT)).isEqualTo(esperado);
    }

    @Test
    @DisplayName("mês passado e futuro: sem ATENCAO por ritmo, só ESTOURADO")
    void status_foraDoMesCorrente() {
        YearMonth setembro = YearMonth.of(2026, 9);
        YearMonth novembro = YearMonth.of(2026, 11);
        assertThat(OrcamentoCalculadora.status(bd("599"), bd("599"), bd("600"), setembro, DIA_15_OUT)).isEqualTo(StatusOrcamento.OK);
        assertThat(OrcamentoCalculadora.status(bd("601"), bd("601"), bd("600"), setembro, DIA_15_OUT)).isEqualTo(StatusOrcamento.ESTOURADO);
        assertThat(OrcamentoCalculadora.status(bd("100"), bd("0"), bd("600"), novembro, DIA_15_OUT)).isEqualTo(StatusOrcamento.OK);
    }

    @Test
    void esperadoAteHoje_eProjecao() {
        assertThat(OrcamentoCalculadora.esperadoAteHoje(bd("600"), OUTUBRO, DIA_15_OUT)).isEqualByComparingTo("290.32");
        // tudo cartão: 300 em 15/31 do mês → 620.00 no fim
        assertThat(OrcamentoCalculadora.projecao(bd("300"), bd("300"), OUTUBRO, DIA_15_OUT)).isEqualByComparingTo("620.00");
        // conta fixa de 1000 + 100 de cartão: só o cartão é extrapolado → 1000 + 206.67
        assertThat(OrcamentoCalculadora.projecao(bd("1100"), bd("100"), OUTUBRO, DIA_15_OUT)).isEqualByComparingTo("1206.67");
        assertThat(OrcamentoCalculadora.projecao(bd("300"), bd("300"), YearMonth.of(2026, 9), DIA_15_OUT)).isEqualByComparingTo("300");
        assertThat(OrcamentoCalculadora.projecao(bd("300"), bd("0"), YearMonth.of(2026, 11), DIA_15_OUT)).isEqualByComparingTo("300");
    }

    @ParameterizedTest(name = "média de {0}, {1}, {2} → sugestão {3}")
    @CsvSource({
            "100.00, 120.00, 150.00, 130.00",   // média 123.33 → arredonda para cima
            "120.00, 120.00, 120.00, 120.00",   // múltiplo exato não sobe
            "0, 0, 31.00, 20.00",               // mês sem gasto conta como zero (média 10.33)
    })
    void sugestaoLimite_mediaArredondadaParaCimaEm10(String a, String b, String c, String esperado) {
        assertThat(OrcamentoCalculadora.sugestaoLimite(List.of(bd(a), bd(b), bd(c)))).isEqualByComparingTo(esperado);
    }

    @Test
    void sugestaoLimite_semHistorico_null_eFallbackPeloMesAtual() {
        List<BigDecimal> zeros = List.of(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        assertThat(OrcamentoCalculadora.sugestaoLimite(zeros)).isNull();
        assertThat(OrcamentoCalculadora.sugestaoParaCategoriaSemLimite(zeros, bd("87.40"))).isEqualByComparingTo("90.00");
        assertThat(OrcamentoCalculadora.sugestaoParaCategoriaSemLimite(zeros, BigDecimal.ZERO)).isNull();
    }

    @Test
    void mesesAnteriores_doMaisRecenteParaOMaisAntigo() {
        assertThat(OrcamentoCalculadora.mesesAnteriores(YearMonth.of(2026, 2), 3))
                .containsExactly(YearMonth.of(2026, 1), YearMonth.of(2025, 12), YearMonth.of(2025, 11));
    }

    @Test
    void agruparPorCategoria_somaPorMes() {
        Map<Long, HistoricoCategoria> mapa = OrcamentoCalculadora.agruparPorCategoria(List.of(
                new GastoCategoriaMes(1L, "Alimentação", "Utensils", 2026, 10, bd("100"), bd("60"), bd("40")),
                new GastoCategoriaMes(1L, "Alimentação", "Utensils", 2026, 9, bd("80"), bd("80"), bd("0")),
                new GastoCategoriaMes(2L, "Transporte", "Car", 2026, 10, bd("50"), bd("50"), bd("50"))));

        assertThat(mapa).hasSize(2);
        assertThat(mapa.get(1L).gastoEm(OUTUBRO)).isEqualByComparingTo("100");
        assertThat(mapa.get(1L).em(OUTUBRO).ateHoje()).isEqualByComparingTo("60");
        assertThat(mapa.get(1L).em(OUTUBRO).cartaoAteHoje()).isEqualByComparingTo("40");
        assertThat(mapa.get(1L).gastoEm(YearMonth.of(2026, 8))).isEqualByComparingTo("0");
        assertThat(mapa.get(2L).descricao()).isEqualTo("Transporte");
    }
}
