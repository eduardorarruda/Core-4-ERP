package br.com.core4erp.cartaoCredito.service;

import br.com.core4erp.cartaoCredito.controller.ParcelamentoCartaoController;
import br.com.core4erp.cartaoCredito.dto.ParcelamentoResponseDto;
import br.com.core4erp.cartaoCredito.repository.LancamentoCartaoRepository;
import br.com.core4erp.cartaoCredito.repository.ParcelaLinha;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
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
            when(repo.gruposDeParcelamentosAtivos(eq(77L), eq(2026 * 12 + 10), any(Pageable.class)))
                    .thenReturn(List.of());
            ParcelamentoCartaoService service = new ParcelamentoCartaoService(repo, ctx,
                    Clock.fixed(LocalDate.of(2026, 10, 14).atTime(12, 0).toInstant(ZoneOffset.UTC), ZoneOffset.UTC));

            assertThat(service.listarAtivos()).isEmpty();
            verify(repo).gruposDeParcelamentosAtivos(eq(77L), eq(2026 * 12 + 10), any(Pageable.class));
            // sem grupo ativo, nem consulta as parcelas
            verify(repo, never()).parcelasDosGrupos(any(), any(), any());
        } finally {
            ctx.clear();
        }
        assertThat(ParcelamentoCartaoService.class.getMethod("listarAtivos").getAnnotation(Requer.class).value())
                .isEqualTo("CARTAO_VISUALIZAR");
        assertThat(ParcelamentoCartaoController.class.getMethod("listar").getAnnotation(Requer.class).value())
                .isEqualTo("CARTAO_VISUALIZAR");
    }

    @Test
    void listarAtivos_aplicaTetoDeGruposEDeLinhas() {
        LancamentoCartaoRepository repo = mock(LancamentoCartaoRepository.class);
        TenantContext ctx = new TenantContext();
        ctx.setEmpresaId(77L);
        try {
            when(repo.gruposDeParcelamentosAtivos(eq(77L), anyInt(), any(Pageable.class)))
                    .thenReturn(List.of("g-note"));
            when(repo.parcelasDosGrupos(eq(77L), eq(List.of("g-note")), any(Pageable.class))).thenReturn(notebook());
            ParcelamentoCartaoService service = new ParcelamentoCartaoService(repo, ctx,
                    Clock.fixed(LocalDate.of(2026, 10, 14).atTime(12, 0).toInstant(ZoneOffset.UTC), ZoneOffset.UTC));

            assertThat(service.listarAtivos()).singleElement()
                    .satisfies(p -> assertThat(p.descricao()).isEqualTo("Notebook"));

            ArgumentCaptor<Pageable> grupos = ArgumentCaptor.forClass(Pageable.class);
            verify(repo).gruposDeParcelamentosAtivos(eq(77L), eq(2026 * 12 + 10), grupos.capture());
            assertThat(grupos.getValue().getPageSize()).isEqualTo(ParcelamentoCartaoService.MAX_PARCELAMENTOS);
            ArgumentCaptor<Pageable> linhas = ArgumentCaptor.forClass(Pageable.class);
            verify(repo).parcelasDosGrupos(eq(77L), eq(List.of("g-note")), linhas.capture());
            assertThat(linhas.getValue().getPageSize()).isEqualTo(ParcelamentoCartaoService.MAX_LINHAS + 1);
        } finally {
            ctx.clear();
        }
    }

    @Test
    void semGrupoTruncado_descartaUltimoGrupoQuandoPassaDoTeto() {
        List<ParcelaLinha> linhas = new ArrayList<>();
        ParcelaLinha base = notebook().get(0);
        for (int i = 0; i < ParcelamentoCartaoService.MAX_LINHAS - 1; i++) {
            linhas.add(base);
        }
        ParcelaLinha outro = new ParcelaLinha("g-z", 1, 3, new BigDecimal("10.00"), 10, 2026,
                "Fone", LocalDate.of(2026, 10, 1), 5L, "Visa Empresa", 10, "Loja Y");
        linhas.add(outro);
        linhas.add(outro); // MAX_LINHAS + 1: o grupo "g-z" pode ter vindo incompleto

        List<ParcelaLinha> r = ParcelamentoCartaoService.semGrupoTruncado(linhas);

        assertThat(r).hasSize(ParcelamentoCartaoService.MAX_LINHAS - 1)
                .allSatisfy(l -> assertThat(l.grupoParcelamento()).isEqualTo("g-note"));
        assertThat(ParcelamentoCartaoService.semGrupoTruncado(notebook())).hasSize(12);
    }
}
