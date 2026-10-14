package br.com.core4erp.cartaoCredito.service;

import br.com.core4erp.cartaoCredito.controller.ParcelamentoCartaoController;
import br.com.core4erp.cartaoCredito.dto.ParcelamentoResponseDto;
import br.com.core4erp.cartaoCredito.repository.LancamentoCartaoRepository;
import br.com.core4erp.cartaoCredito.repository.ParcelaLinha;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ParcelamentoCartaoServiceTest {

    private static final YearMonth OUT = YearMonth.of(2026, 10);

    /** Notebook 12× de R$ 350,00 com 1ª fatura em 04/2026 → em 10/2026 está na 7ª. */
    private static List<ParcelaLinha> notebook() {
        List<ParcelaLinha> l = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            YearMonth f = YearMonth.of(2026, 4).plusMonths(i);
            l.add(new ParcelaLinha("g-note", i + 1, 12, new BigDecimal("350.00"), f.getMonthValue(), f.getYear(),
                    "Notebook", LocalDate.of(2026, 3, 20), 5L, "Visa Empresa", 10, "Loja X"));
        }
        return l;
    }

    @Test
    void agrupar_calculaParcelaAtualRestanteEProximas() {
        List<ParcelamentoResponseDto> r = ParcelamentoCartaoService.agrupar(notebook(), OUT);

        assertThat(r).singleElement().satisfies(p -> {
            assertThat(p.parcelaAtual()).isEqualTo(7);
            assertThat(p.totalParcelas()).isEqualTo(12);
            assertThat(p.parcelasRestantes()).isEqualTo(5);
            assertThat(p.valorTotal()).isEqualByComparingTo("4200.00");
            assertThat(p.valorParcela()).isEqualByComparingTo("350.00");
            assertThat(p.valorRestante()).isEqualByComparingTo("1750.00");
            assertThat(p.primeiraFatura()).isEqualTo("2026-04");
            assertThat(p.terminaEm()).isEqualTo("2027-03");
            assertThat(p.cartao().nome()).isEqualTo("Visa Empresa");
            assertThat(p.proximasParcelas()).hasSize(5);
            assertThat(p.proximasParcelas().get(0).numeroParcela()).isEqualTo(8);
            assertThat(p.proximasParcelas().get(0).fatura()).isEqualTo("2026-11");
            // regra do fechamento: fatura de novembro vence no dia 10 de dezembro
            assertThat(p.proximasParcelas().get(0).dataVencimento()).isEqualTo(LocalDate.of(2026, 12, 10));
        });
    }

    @Test
    void agrupar_parcelamentoQueAindaNaoComecou_parcelaAtualZero_eOrdenaPeloTermino() {
        List<ParcelaLinha> linhas = new ArrayList<>(notebook());
        for (int i = 0; i < 3; i++) {
            YearMonth f = OUT.plusMonths(1 + i);
            linhas.add(new ParcelaLinha("g-tv", i + 1, 3, new BigDecimal("100.00"), f.getMonthValue(), f.getYear(),
                    "TV", LocalDate.of(2026, 10, 12), 6L, "Master", 31, null));
        }

        List<ParcelamentoResponseDto> r = ParcelamentoCartaoService.agrupar(linhas, OUT);

        assertThat(r).extracting(ParcelamentoResponseDto::descricao).containsExactly("TV", "Notebook");
        ParcelamentoResponseDto tv = r.get(0);
        assertThat(tv.parcelaAtual()).isZero();
        assertThat(tv.parcelasRestantes()).isEqualTo(3);
        assertThat(tv.valorRestante()).isEqualByComparingTo("300.00");
        // dia 31 em mês curto: vencimento ajustado ao último dia (fatura 01/2027 vence em 28/02/2027)
        assertThat(tv.proximasParcelas().get(2).dataVencimento()).isEqualTo(LocalDate.of(2027, 2, 28));
    }

    @Test
    void listarAtivos_filtraPelaEmpresaDoContexto_eExigeCartaoVisualizar() throws Exception {
        LancamentoCartaoRepository repo = mock(LancamentoCartaoRepository.class);
        TenantContext ctx = new TenantContext();
        ctx.setEmpresaId(77L);
        try {
            when(repo.parcelasDeParcelamentosAtivos(77L, 2026 * 12 + 10)).thenReturn(List.of());
            ParcelamentoCartaoService service = new ParcelamentoCartaoService(repo, ctx,
                    Clock.fixed(LocalDate.of(2026, 10, 14).atTime(12, 0).toInstant(ZoneOffset.UTC), ZoneOffset.UTC));

            assertThat(service.listarAtivos()).isEmpty();
            verify(repo).parcelasDeParcelamentosAtivos(77L, 2026 * 12 + 10);
        } finally {
            ctx.clear();
        }
        assertThat(ParcelamentoCartaoService.class.getMethod("listarAtivos").getAnnotation(Requer.class).value())
                .isEqualTo("CARTAO_VISUALIZAR");
        assertThat(ParcelamentoCartaoController.class.getMethod("listar").getAnnotation(Requer.class).value())
                .isEqualTo("CARTAO_VISUALIZAR");
    }
}
