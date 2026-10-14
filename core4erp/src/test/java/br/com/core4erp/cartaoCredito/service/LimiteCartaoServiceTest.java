package br.com.core4erp.cartaoCredito.service;

import br.com.core4erp.cartaoCredito.repository.LancamentoCartaoRepository;
import br.com.core4erp.cartaoCredito.repository.SaldoFaturaCartaoLinha;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Regra do limite usado (§17): Σ líquido das faturas NÃO pagas (aberta, fechadas pendentes e
 * futuras, inclusive parcelas 2..n), piso em zero por cartão. "Hoje" no cenário = 10/2026.
 */
class LimiteCartaoServiceTest {

    private static final Long EID = 7L;
    private static final Long CARTAO = 1L;
    private static final Long OUTRO_CARTAO = 2L;

    private static SaldoFaturaCartaoLinha linha(Long cartao, int ano, int mes, String liquido, boolean paga) {
        return new SaldoFaturaCartaoLinha(cartao, ano, mes, new BigDecimal(liquido), paga);
    }

    private final LancamentoCartaoRepository repo = mock(LancamentoCartaoRepository.class);
    private final LimiteCartaoService service = new LimiteCartaoService(repo);

    @Test
    @DisplayName("compra que cai na PRÓXIMA fatura consome limite")
    void compraNaProximaFatura_conta() {
        when(repo.saldosPorFaturaDoCartao(EID)).thenReturn(List.of(
                linha(CARTAO, 2026, 10, "200.00", false),
                linha(CARTAO, 2026, 11, "150.00", false))); // compra após o fechamento

        assertThat(service.limiteUsado(EID, CARTAO)).isEqualByComparingTo("350.00");
    }

    @Test
    @DisplayName("parcelas futuras (2..n) consomem limite desde a compra")
    void parcelasFuturas_contam() {
        // 3× de R$ 100,00: faturas 11/2026, 12/2026 e 01/2027
        when(repo.saldosPorFaturaDoCartao(EID)).thenReturn(List.of(
                linha(CARTAO, 2026, 11, "100.00", false),
                linha(CARTAO, 2026, 12, "100.00", false),
                linha(CARTAO, 2027, 1, "100.00", false)));

        assertThat(service.limiteUsado(EID, CARTAO)).isEqualByComparingTo("300.00");
    }

    @Test
    @DisplayName("fatura paga libera o limite; fechada e ainda não paga continua consumindo")
    void faturaPaga_naoConta_fechadaPendenteConta() {
        when(repo.saldosPorFaturaDoCartao(EID)).thenReturn(List.of(
                linha(CARTAO, 2026, 4, "900.00", true),   // paga há meses
                linha(CARTAO, 2026, 9, "500.00", true),   // paga
                linha(CARTAO, 2026, 10, "400.00", false), // fechada, conta pendente
                linha(CARTAO, 2026, 11, "50.00", false)));

        assertThat(service.limiteUsado(EID, CARTAO)).isEqualByComparingTo("450.00");
    }

    @Test
    @DisplayName("ENTRADA (estorno/crédito) reduz o limite usado")
    void entrada_reduz() {
        // a query já entrega SAIDA − ENTRADA por fatura: 300 de compra − 80 de estorno = 220
        when(repo.saldosPorFaturaDoCartao(EID)).thenReturn(List.of(
                linha(CARTAO, 2026, 10, "220.00", false),
                linha(CARTAO, 2026, 11, "-20.00", false))); // fatura só com crédito

        assertThat(service.limiteUsado(EID, CARTAO)).isEqualByComparingTo("200.00");
    }

    @Test
    @DisplayName("créditos maiores que as compras → piso em zero, nunca negativo")
    void creditoMaior_pisoZero() {
        when(repo.saldosPorFaturaDoCartao(EID)).thenReturn(List.of(
                linha(CARTAO, 2026, 10, "100.00", false),
                linha(CARTAO, 2026, 11, "-250.00", false)));

        assertThat(service.limiteUsado(EID, CARTAO)).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("piso é por cartão: crédito sobrando num cartão não libera limite de outro")
    void pisoPorCartao_noTotal() {
        when(repo.saldosPorFaturaDoCartao(EID)).thenReturn(List.of(
                linha(CARTAO, 2026, 10, "-300.00", false),
                linha(OUTRO_CARTAO, 2026, 10, "500.00", false),
                linha(OUTRO_CARTAO, 2026, 9, "1000.00", true)));

        Map<Long, BigDecimal> porCartao = service.limiteUsadoPorCartao(EID);
        assertThat(porCartao.get(CARTAO)).isEqualByComparingTo("0");
        assertThat(porCartao.get(OUTRO_CARTAO)).isEqualByComparingTo("500.00");
        assertThat(service.limiteUsadoTotal(EID)).isEqualByComparingTo("500.00");
        verify(repo, times(2)).saldosPorFaturaDoCartao(EID); // uma consulta agregada por chamada
    }

    @Test
    @DisplayName("cartão sem lançamentos (ou só faturas pagas) → zero")
    void semLancamentos_zero() {
        when(repo.saldosPorFaturaDoCartao(EID)).thenReturn(List.of(
                linha(OUTRO_CARTAO, 2026, 9, "80.00", true)));

        assertThat(service.limiteUsado(EID, CARTAO)).isEqualByComparingTo("0");
        assertThat(service.limiteUsado(EID, OUTRO_CARTAO)).isEqualByComparingTo("0");
        assertThat(service.limiteUsadoTotal(EID)).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("lista vazia/nula → mapa vazio")
    void calcular_vazio() {
        assertThat(LimiteCartaoService.calcular(List.of())).isEmpty();
        assertThat(LimiteCartaoService.calcular(null)).isEmpty();
    }
}
