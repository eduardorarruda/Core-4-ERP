package br.com.core4erp.insights.service;

import br.com.core4erp.insights.dto.InsightsResponseDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.CategoriaForaDoNormalDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.DiaSemanaDto;
import br.com.core4erp.orcamento.repository.GastoRepository.GastoCategoriaMes;
import br.com.core4erp.orcamento.repository.GastoRepository.GastoDiario;
import br.com.core4erp.orcamento.repository.GastoRepository.GastoIndividual;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class InsightsCalculadoraTest {

    private static final LocalDate HOJE = LocalDate.of(2026, 10, 14); // quarta-feira
    private static final YearMonth OUT = YearMonth.of(2026, 10);
    private static final YearMonth SET = YearMonth.of(2026, 9);
    private static final YearMonth AGO = YearMonth.of(2026, 8);
    private static final YearMonth JUL = YearMonth.of(2026, 7);

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }

    /** Gasto de cartão (variável) no dia. */
    private static GastoDiario dia(LocalDate d, String valor) {
        return new GastoDiario(d, bd(valor), 1, bd(valor));
    }

    /** Conta a pagar (vencimento conhecido) no dia. */
    private static GastoDiario conta(LocalDate d, String valor) {
        return new GastoDiario(d, bd(valor), 1, BigDecimal.ZERO);
    }

    private static GastoCategoriaMes cat(long id, String desc, YearMonth m, String v) {
        return new GastoCategoriaMes(id, desc, "Tag", m.getYear(), m.getMonthValue(), bd(v), bd(v), BigDecimal.ZERO);
    }

    /** 100/dia nos dias 1..10 de cada mês anterior; outubro: 150/dia nos dias 1..10 + conta agendada dia 20. */
    private static List<GastoDiario> diarioPadrao() {
        List<GastoDiario> lista = new ArrayList<>();
        for (YearMonth m : List.of(JUL, AGO, SET)) {
            for (int d = 1; d <= 10; d++) lista.add(dia(m.atDay(d), "100.00"));
        }
        for (int d = 1; d <= 10; d++) lista.add(dia(OUT.atDay(d), "150.00"));
        lista.add(conta(OUT.atDay(20), "400.00"));
        return lista;
    }

    private static InsightsResponseDto calcular(YearMonth mes, List<GastoDiario> diario, List<GastoCategoriaMes> mensal) {
        return InsightsCalculadora.calcular(new InsightsCalculadora.Entrada(mes, HOJE, diario, mensal,
                List.of(new GastoIndividual("Aluguel", bd("1800.00"), OUT.atDay(5), "CONTA", "Casa", "Imobiliária"))));
    }

    @Test
    void diaReferencia_porTipoDeMes() {
        assertThat(InsightsCalculadora.diaReferencia(OUT, HOJE)).isEqualTo(14);
        assertThat(InsightsCalculadora.diaReferencia(SET, HOJE)).isEqualTo(30);
        assertThat(InsightsCalculadora.diaReferencia(OUT.plusMonths(1), HOJE)).isZero();
    }

    @Test
    void ritmo_comparaMesmoPontoDoMesAnteriorEMedia3Meses() {
        InsightsResponseDto r = calcular(OUT, diarioPadrao(), List.of());

        assertThat(r.ritmo().gastoAteHoje()).isEqualByComparingTo("1500.00");          // agendado do dia 20 fica de fora
        assertThat(r.ritmo().mesmoPeriodoMesAnterior()).isEqualByComparingTo("1000.00");
        assertThat(r.ritmo().mediaMesmoPeriodo3Meses()).isEqualByComparingTo("1000.00");
        assertThat(r.ritmo().variacaoVsMesAnterior()).isEqualByComparingTo("50.0");
        assertThat(r.ritmo().variacaoVsMedia3Meses()).isEqualByComparingTo("50.0");
        assertThat(r.ritmo().curva()).hasSize(31);
        assertThat(r.ritmo().curva().get(13).atual()).isEqualByComparingTo("1500.00");
        assertThat(r.ritmo().curva().get(14).atual()).isNull();                         // depois de hoje
        assertThat(r.ritmo().curva().get(30).mesAnterior()).isEqualByComparingTo("1000.00");
    }

    @Test
    void resumo_kpisAteHoje() {
        InsightsResponseDto r = calcular(OUT, diarioPadrao(), List.of());

        assertThat(r.resumo().quantidade()).isEqualTo(10);
        assertThat(r.resumo().ticketMedio()).isEqualByComparingTo("150.00");
        assertThat(r.resumo().mediaDiaria()).isEqualByComparingTo("107.14");   // 1500 / 14
    }

    @Test
    void projecao_mesCorrente_ritmoLinearMaisAgendado() {
        InsightsResponseDto r = calcular(OUT, diarioPadrao(), List.of());

        // 1500 realizado + 400 agendado + 107.14/dia de cartão × 17 dias restantes
        assertThat(r.projecao().ritmoDiario()).isEqualByComparingTo("107.14");
        assertThat(r.projecao().agendadoRestante()).isEqualByComparingTo("400.00");
        assertThat(r.projecao().valorProjetado()).isEqualByComparingTo("3721.38");
        assertThat(r.projecao().totalMesAnterior()).isEqualByComparingTo("1000.00");
        assertThat(r.projecao().mesEncerrado()).isFalse();
    }

    @Test
    void projecao_contaFixaNoInicioDoMes_naoEExtrapolada() {
        List<GastoDiario> diario = List.of(
                conta(OUT.atDay(5), "3000.00"),            // folha paga no dia 5
                dia(OUT.atDay(7), "70.00"), dia(OUT.atDay(12), "70.00"));

        InsightsResponseDto r = calcular(OUT, diario, List.of());

        // 3140 conhecidos + 10.00/dia de cartão × 17 dias = 3310 (e não 3140/14×31 ≈ 6953)
        assertThat(r.projecao().ritmoDiario()).isEqualByComparingTo("10.00");
        assertThat(r.projecao().valorProjetado()).isEqualByComparingTo("3310.00");
    }

    @Test
    void projecao_mesPassado_eFuturo() {
        InsightsResponseDto passado = calcular(SET, diarioPadrao(), List.of());
        assertThat(passado.projecao().mesEncerrado()).isTrue();
        assertThat(passado.projecao().valorProjetado()).isEqualByComparingTo("1000.00");

        InsightsResponseDto futuro = calcular(OUT.plusMonths(1),
                List.of(conta(OUT.plusMonths(1).atDay(5), "250.00")), List.of());
        assertThat(futuro.diaReferencia()).isZero();
        assertThat(futuro.projecao().valorProjetado()).isEqualByComparingTo("250.00");
        assertThat(futuro.projecao().agendadoRestante()).isEqualByComparingTo("250.00");
        assertThat(futuro.ritmo().variacaoVsMesAnterior()).isNull();
    }

    @Test
    void diaDaSemana_janela90Dias_marcaUmSoMaior() {
        List<GastoDiario> diario = List.of(
                dia(LocalDate.of(2026, 10, 10), "300.00"),   // sábado
                dia(LocalDate.of(2026, 10, 3), "200.00"),    // sábado
                dia(LocalDate.of(2026, 10, 12), "100.00"),   // segunda
                dia(LocalDate.of(2026, 7, 1), "9999.00"));   // fora da janela (antes de 17/07)

        List<DiaSemanaDto> semana = InsightsCalculadora.porDiaDaSemana(
                diario.stream().collect(java.util.stream.Collectors.toMap(GastoDiario::data, g -> g)), HOJE);

        assertThat(semana).hasSize(7);
        assertThat(semana.get(0).nome()).isEqualTo("segunda-feira");
        DiaSemanaDto sabado = semana.get(5);
        assertThat(sabado.diaSemana()).isEqualTo(6);
        assertThat(sabado.total()).isEqualByComparingTo("500.00");
        assertThat(sabado.quantidade()).isEqualTo(2);
        assertThat(semana).filteredOn(DiaSemanaDto::maior).containsExactly(sabado);
        assertThat(semana.get(2).total()).isEqualByComparingTo("0"); // quarta: nada (9999 ficou fora)
    }

    @Test
    void foraDoNormal_acimaENova_ignoraRuido() {
        List<GastoCategoriaMes> mensal = List.of(
                // Alimentação: média 400 → 552 (+38%, +152) → ACIMA
                cat(1, "Alimentação", JUL, "380"), cat(1, "Alimentação", AGO, "400"), cat(1, "Alimentação", SET, "420"),
                cat(1, "Alimentação", OUT, "552"),
                // Transporte: +30% mas só R$ 30 acima → ruído
                cat(2, "Transporte", JUL, "100"), cat(2, "Transporte", AGO, "100"), cat(2, "Transporte", SET, "100"),
                cat(2, "Transporte", OUT, "130"),
                // Viagens: sem histórico → NOVA
                cat(3, "Viagens", OUT, "450"),
                // Presentes: nova mas abaixo de R$ 50 → ruído
                cat(4, "Presentes", OUT, "30"),
                // Lazer: +15% → abaixo do mínimo de 20%
                cat(5, "Lazer", JUL, "1000"), cat(5, "Lazer", AGO, "1000"), cat(5, "Lazer", SET, "1000"),
                cat(5, "Lazer", OUT, "1150"));

        List<CategoriaForaDoNormalDto> fora = InsightsCalculadora.foraDoNormal(mensal, OUT);

        assertThat(fora).extracting(CategoriaForaDoNormalDto::descricao).containsExactly("Viagens", "Alimentação");
        CategoriaForaDoNormalDto alimentacao = fora.get(1);
        assertThat(alimentacao.tipo()).isEqualTo("ACIMA_DO_NORMAL");
        assertThat(alimentacao.media3Meses()).isEqualByComparingTo("400.00");
        assertThat(alimentacao.variacaoPercentual()).isEqualByComparingTo("38.0");
        assertThat(alimentacao.zScore()).isEqualByComparingTo("9.31"); // desvio pop. 16.33
        assertThat(fora.get(0).tipo()).isEqualTo("NOVA");
        assertThat(fora.get(0).variacaoPercentual()).isNull();
    }

    @Test
    void zScore_historicoConstante_null() {
        assertThat(InsightsCalculadora.zScore(bd("200"), bd("100.00"),
                List.of(bd("100"), bd("100"), bd("100")))).isNull();
    }

    @Test
    void variacao_baseZero_null() {
        assertThat(InsightsCalculadora.variacao(bd("10"), BigDecimal.ZERO)).isNull();
        assertThat(InsightsCalculadora.variacao(bd("90"), bd("100"))).isEqualByComparingTo("-10.0");
    }

    @Test
    void calcular_geraFrasesEMaioresGastos() {
        InsightsResponseDto r = calcular(OUT, diarioPadrao(), List.of());

        assertThat(r.maioresGastos()).singleElement().satisfies(g -> assertThat(g.origem()).isEqualTo("CONTA"));
        assertThat(r.frases()).isNotEmpty();
        assertThat(r.frases().get(0).texto())
                .isEqualTo("Até o dia 14 você gastou 50% a mais que no mesmo ponto do mês passado.");
    }
}
