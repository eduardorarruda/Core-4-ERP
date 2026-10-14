package br.com.core4erp.chat.tools.consulta;

import br.com.core4erp.cartaoCredito.dto.ParcelamentoResponseDto;
import br.com.core4erp.cartaoCredito.dto.ParcelamentoResponseDto.CartaoResumoDto;
import br.com.core4erp.cartaoCredito.dto.ParcelamentoResponseDto.ProximaParcelaDto;
import br.com.core4erp.cartaoCredito.service.ParcelamentoCartaoService;
import br.com.core4erp.exception.AcessoNegadoException;
import br.com.core4erp.insights.dto.InsightsResponseDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.CategoriaForaDoNormalDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.FraseInsightDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.MaiorGastoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.ProjecaoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.ResumoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.RitmoDto;
import br.com.core4erp.insights.service.InsightsService;
import br.com.core4erp.orcamento.dto.CategoriaOrcamentoDto;
import br.com.core4erp.orcamento.dto.OrcamentoItemResponseDto;
import br.com.core4erp.orcamento.dto.OrcamentoMesResponseDto;
import br.com.core4erp.orcamento.enums.StatusOrcamento;
import br.com.core4erp.orcamento.service.OrcamentoService;
import org.junit.jupiter.api.Test;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AnaliseFinanceiraToolsTest {

    private final OrcamentoService orcamentoService = mock(OrcamentoService.class);
    private final InsightsService insightsService = mock(InsightsService.class);
    private final ParcelamentoCartaoService parcelamentoService = mock(ParcelamentoCartaoService.class);
    private final AnaliseFinanceiraTools tools =
            new AnaliseFinanceiraTools(orcamentoService, insightsService, parcelamentoService);

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }

    // ── Orçamentos ───────────────────────────────────────────────────────────

    private static OrcamentoItemResponseDto item(String categoria, String limite, String gasto, String pct,
                                                 String projecao, StatusOrcamento status) {
        return new OrcamentoItemResponseDto(1L, new CategoriaOrcamentoDto(10L, categoria, "x"),
                bd(limite), bd(gasto), bd(gasto), bd(limite).subtract(bd(gasto)), bd(pct), bd("45"),
                bd("0"), bd(projecao), status, null);
    }

    @Test
    void consultarOrcamentos_formataLimiteGastoPercentualStatusERestanteEmPtBr() {
        when(orcamentoService.listar(YearMonth.of(2026, 10))).thenReturn(new OrcamentoMesResponseDto(
                "2026-10", LocalDate.of(2026, 10, 14), bd("45.16"), bd("2500.00"), bd("1860.50"), bd("74.42"),
                bd("320.00"),
                List.of(item("Alimentação", "1000.00", "1250.50", "125.05", "1250.50", StatusOrcamento.ESTOURADO),
                        item("Lazer", "1500.00", "610.00", "40.666", "980.00", StatusOrcamento.OK))));

        String r = tools.consultarOrcamentos("2026-10");

        assertThat(r).contains("Orçamentos de 2026-10 (mês decorrido: 45,2%)")
                .contains("Total: gasto R$ 1.860,50 de R$ 2.500,00 (74,4%) | restante R$ 639,50")
                .contains("Gasto em categorias sem orçamento: R$ 320,00")
                .contains("- Alimentação: limite R$ 1.000,00 | gasto R$ 1.250,50 (125,1%) | restante -R$ 250,50"
                        + " | status ESTOURADO (passou do limite)")
                .contains("- Lazer: limite R$ 1.500,00 | gasto R$ 610,00 (40,7%) | restante R$ 890,00 | status OK"
                        + " | projeção R$ 980,00");
        // projeção igual ao gasto não é repetida
        assertThat(r.lines().filter(l -> l.startsWith("- Alimentação")).findFirst().orElseThrow())
                .doesNotContain("projeção");
    }

    @Test
    void consultarOrcamentos_semMes_usaMesAtualDoService() {
        when(orcamentoService.listar(null)).thenReturn(new OrcamentoMesResponseDto(
                "2026-10", null, bd("0"), bd("0"), bd("0"), bd("0"), bd("0"), List.of()));

        assertThat(tools.consultarOrcamentos(null)).isEqualTo("Nenhum orçamento definido (mês 2026-10).");
        assertThat(tools.consultarOrcamentos("  ")).startsWith("Nenhum orçamento definido");
    }

    @Test
    void consultarOrcamentos_mesInvalido_naoChamaServiceEDevolveOrientacao() {
        assertThat(tools.consultarOrcamentos("outubro")).isEqualTo(AnaliseFinanceiraTools.MES_INVALIDO);
        verify(orcamentoService, never()).listar(any());
    }

    @Test
    void consultarOrcamentos_semPermissao_devolveMensagemAmigavelSemCodigoTecnico() {
        when(orcamentoService.listar(any())).thenThrow(new AcessoNegadoException("Permissão necessária: ORCAMENTO_VISUALIZAR"));

        String r = tools.consultarOrcamentos(null);

        assertThat(r).contains("não tem permissão para ver os orçamentos").doesNotContain("ORCAMENTO_VISUALIZAR");
    }

    @Test
    void consultarOrcamentos_anoForaDaFaixa_devolveMensagemDoService() {
        when(orcamentoService.listar(any())).thenThrow(new IllegalArgumentException("Escolha um mês entre 2000 e 2100."));

        assertThat(tools.consultarOrcamentos("1990-01")).isEqualTo("Escolha um mês entre 2000 e 2100.");
    }

    // ── Insights ─────────────────────────────────────────────────────────────

    @Test
    void consultarInsights_formataRitmoProjecaoForaDoNormalEFrases() {
        when(insightsService.gerar(YearMonth.of(2026, 10))).thenReturn(new InsightsResponseDto(
                "2026-10", LocalDate.of(2026, 10, 14), 14, 31,
                new ResumoDto(bd("2100.00"), 42, bd("50.00"), bd("150.00")),
                new RitmoDto(bd("2100.00"), bd("1800.00"), bd("2000.00"), bd("16.67"), bd("5.00"), List.of()),
                List.of(),
                List.of(new CategoriaForaDoNormalDto(1L, "Lazer", "x", bd("600.00"), bd("200.00"), bd("400.00"),
                                bd("200.00"), bd("2.1"), "ACIMA_DO_NORMAL"),
                        new CategoriaForaDoNormalDto(2L, "Pets", "x", bd("80.00"), bd("0"), bd("80.00"),
                                null, null, "NOVA")),
                List.of(new MaiorGastoDto("Mercado", bd("450.00"), LocalDate.of(2026, 10, 3), "CARTAO", "Alimentação", null)),
                new ProjecaoDto(bd("4300.00"), bd("2100.00"), bd("80.00"), bd("700.00"), bd("4000.00"), bd("7.5"), false),
                List.of(new FraseInsightDto("ALERTA", "Você gastou 200% a mais com Lazer."))));

        String r = tools.consultarInsights("2026-10");

        assertThat(r).startsWith("Insights de 2026-10 (até o dia 14 de 31)")
                .contains("Resumo: R$ 2.100,00 em 42 gasto(s) | ticket médio R$ 50,00 | média diária R$ 150,00")
                .contains("Ritmo: até hoje R$ 2.100,00 | mesmo período do mês anterior R$ 1.800,00 (+16,7%)"
                        + " | média do mesmo período (3 meses) R$ 2.000,00 (+5%)")
                .contains("Projeção de fechamento: R$ 4.300,00 | mês anterior R$ 4.000,00 (+7,5%) | já agendado R$ 700,00")
                .contains("- Lazer: R$ 600,00 vs média R$ 200,00 (+200%)")
                .contains("- Pets: R$ 80,00 (nova — sem gasto nos 3 meses anteriores)")
                .contains("- Mercado: R$ 450,00 em 03/10/2026 (cartão)")
                .contains("- [ALERTA] Você gastou 200% a mais com Lazer.");
    }

    @Test
    void consultarInsights_mesEncerradoSemForaDoNormal() {
        when(insightsService.gerar(YearMonth.of(2026, 9))).thenReturn(new InsightsResponseDto(
                "2026-09", LocalDate.of(2026, 9, 30), 30, 30,
                new ResumoDto(bd("0"), 0, bd("0"), bd("0")),
                new RitmoDto(bd("0"), bd("0"), bd("0"), null, null, List.of()),
                List.of(), List.of(), List.of(),
                new ProjecaoDto(bd("0"), bd("0"), bd("0"), bd("0"), bd("0"), null, true),
                List.of()));

        String r = tools.consultarInsights("2026-09");

        assertThat(r).contains("Total do mês (encerrado): R$ 0,00 | mês anterior R$ 0,00")
                .contains("Categorias fora do normal: nenhuma")
                .doesNotContain("(+").doesNotContain("Maiores gastos").doesNotContain("Leituras");
    }

    @Test
    void consultarInsights_semPermissao_devolveMensagemAmigavel() {
        when(insightsService.gerar(any())).thenThrow(new AcessoNegadoException("Permissão necessária: DASHBOARD_VISUALIZAR"));

        assertThat(tools.consultarInsights(null)).contains("não tem permissão para ver os insights")
                .doesNotContain("DASHBOARD_VISUALIZAR");
    }

    // ── Parcelamentos ────────────────────────────────────────────────────────

    @Test
    void consultarParcelamentos_formataParcelaAtualRestanteEProximaFatura() {
        when(parcelamentoService.listarAtivos()).thenReturn(List.of(new ParcelamentoResponseDto(
                "g1", "Notebook", "Loja X", new CartaoResumoDto(1L, "Nubank"), LocalDate.of(2026, 8, 5),
                bd("3000.00"), bd("300.00"), 3, 10, 7, bd("2100.00"), "2026-08", "2027-05",
                List.of(new ProximaParcelaDto(4, "2026-11", LocalDate.of(2026, 12, 10), bd("300.00")),
                        new ProximaParcelaDto(5, "2026-12", LocalDate.of(2027, 1, 10), bd("300.00"))))));

        String r = tools.consultarParcelamentos();

        assertThat(r).startsWith("Compras parceladas em andamento: 1 | total ainda a pagar R$ 2.100,00")
                .contains("- Notebook (Loja X) no cartão Nubank: parcela 3/10 de R$ 300,00 | total R$ 3.000,00"
                        + " | faltam 7 (R$ 2.100,00) | termina na fatura 2027-05"
                        + " | próxima: fatura 2026-11, vence 10/12/2026")
                .doesNotContain("2026-12,");
    }

    @Test
    void consultarParcelamentos_vazio_devolveMensagemDescritiva() {
        when(parcelamentoService.listarAtivos()).thenReturn(List.of());

        assertThat(tools.consultarParcelamentos())
                .isEqualTo("Você não tem compras parceladas em andamento no cartão.");
    }

    @Test
    void consultarParcelamentos_semPermissao_devolveMensagemAmigavel() {
        when(parcelamentoService.listarAtivos()).thenThrow(new AcessoNegadoException("Permissão necessária: CARTAO_VISUALIZAR"));

        assertThat(tools.consultarParcelamentos()).contains("não tem permissão para ver os parcelamentos")
                .doesNotContain("CARTAO_VISUALIZAR");
    }

    // ── Contrato com o Spring AI ─────────────────────────────────────────────

    @Test
    void ferramentasPublicadasComNomesDeLeituraEMesOpcional() {
        ToolCallback[] callbacks = ToolCallbacks.from(tools);
        Set<String> nomes = Arrays.stream(callbacks).map(c -> c.getToolDefinition().name()).collect(Collectors.toSet());

        assertThat(nomes).containsExactlyInAnyOrder("consultarOrcamentos", "consultarInsights", "consultarParcelamentos");
        String schemaOrcamentos = Arrays.stream(callbacks)
                .filter(c -> c.getToolDefinition().name().equals("consultarOrcamentos"))
                .findFirst().orElseThrow().getToolDefinition().inputSchema();
        assertThat(schemaOrcamentos).doesNotContain("\"required\":[\"mes\"]")
                .doesNotContain("\"required\" : [ \"mes\" ]");
    }

    @Test
    void percentual_eVariacao() {
        assertThat(AnaliseFinanceiraFormatter.percentual(bd("100.000000"))).isEqualTo("100%");
        assertThat(AnaliseFinanceiraFormatter.percentual(bd("0"))).isEqualTo("0%");
        assertThat(AnaliseFinanceiraFormatter.percentual(null)).isEqualTo("—");
        assertThat(AnaliseFinanceiraFormatter.variacao(bd("-3.04"))).isEqualTo(" (-3%)");
        assertThat(AnaliseFinanceiraFormatter.variacao(null)).isEmpty();
    }
}
