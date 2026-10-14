package br.com.core4erp.chat.tools.consulta;

import br.com.core4erp.cartaoCredito.dto.ParcelamentoResponseDto;
import br.com.core4erp.cartaoCredito.dto.ParcelamentoResponseDto.CartaoResumoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.CategoriaForaDoNormalDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.FraseInsightDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.MaiorGastoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.ProjecaoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.ResumoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.RitmoDto;
import br.com.core4erp.orcamento.dto.CategoriaOrcamentoDto;
import br.com.core4erp.orcamento.dto.OrcamentoItemResponseDto;
import br.com.core4erp.orcamento.dto.OrcamentoMesResponseDto;
import br.com.core4erp.orcamento.enums.StatusOrcamento;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Regressão do "Format specifier '% e'": nomes de categoria/parceiro/compra e frases de insight
 * ("75% a mais") com "%" passam pelos formatadores das tools sem erro e saem literais.
 */
class AnaliseFinanceiraFormatterPercentualTest {

    private static BigDecimal bd(String v) {
        return new BigDecimal(v);
    }

    @ParameterizedTest
    @ValueSource(strings = {"%", "% e", "100%", "%s", "Lazer 50% a mais", "%d %n %%"})
    void orcamentos_categoriaComPercentual(String nome) {
        OrcamentoItemResponseDto item = new OrcamentoItemResponseDto(1L, new CategoriaOrcamentoDto(10L, nome, "x"),
                bd("100"), bd("150"), bd("150"), bd("-50"), bd("150"), bd("45"), bd("0"), bd("150"),
                StatusOrcamento.ESTOURADO, null);

        String r = AnaliseFinanceiraFormatter.orcamentos(new OrcamentoMesResponseDto("2026-10",
                LocalDate.of(2026, 10, 14), bd("45"), bd("100"), bd("150"), bd("150"), bd("0"), List.of(item)));

        assertThat(r).contains("- " + nome + ": limite R$ 100,00 | gasto R$ 150,00 (150%)");
    }

    @ParameterizedTest
    @ValueSource(strings = {"%", "% e", "100%", "%s", "Você gastou 75% a mais com Lazer.", "%d %n %%"})
    void insights_frasesECategoriasComPercentual(String texto) {
        InsightsResponseDto dto = new InsightsResponseDto("2026-10", LocalDate.of(2026, 10, 14), 14, 31,
                new ResumoDto(bd("10"), 1, bd("10"), bd("1")),
                new RitmoDto(bd("10"), bd("5"), bd("5"), bd("100"), bd("100"), List.of()),
                List.of(),
                List.of(new CategoriaForaDoNormalDto(1L, texto, "x", bd("80"), bd("40"), bd("40"), bd("100"),
                        bd("2"), "ACIMA_DO_NORMAL")),
                List.of(new MaiorGastoDto(texto, bd("80"), LocalDate.of(2026, 10, 3), "CONTA", texto, null)),
                new ProjecaoDto(bd("20"), bd("10"), bd("1"), bd("0"), bd("10"), bd("100"), false),
                List.of(new FraseInsightDto("ALERTA", texto)));

        String r = AnaliseFinanceiraFormatter.insights(dto);

        assertThat(r).contains("- " + texto + ": R$ 80,00 vs média R$ 40,00 (+100%)")
                .contains("- [ALERTA] " + texto)
                .contains("(+100%)");
    }

    @ParameterizedTest
    @ValueSource(strings = {"%", "% e", "100%", "%s"})
    void parcelamentos_descricaoEParceiroComPercentual(String texto) {
        String r = AnaliseFinanceiraFormatter.parcelamentos(List.of(new ParcelamentoResponseDto(
                "g1", "TV " + texto, "Loja " + texto, new CartaoResumoDto(1L, "Cartão " + texto),
                LocalDate.of(2026, 8, 5), bd("1000"), bd("100"), 3, 10, 7, bd("700"), "2026-08", "2027-05",
                List.of())));

        assertThat(r).contains("- TV " + texto + " (Loja " + texto + ") no cartão Cartão " + texto);
    }
}
