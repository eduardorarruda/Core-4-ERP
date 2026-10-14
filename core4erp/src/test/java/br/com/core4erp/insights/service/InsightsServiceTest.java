package br.com.core4erp.insights.service;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.insights.controller.InsightsController;
import br.com.core4erp.insights.dto.InsightsResponseDto;
import br.com.core4erp.orcamento.repository.GastoRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class InsightsServiceTest {

    private static final long EMPRESA = 42L;
    private static final LocalDate HOJE = LocalDate.of(2026, 10, 14);

    private final GastoRepository gastoRepo = mock(GastoRepository.class);
    private final TenantContext ctx = new TenantContext();
    private final InsightsService service = new InsightsService(gastoRepo, ctx,
            Clock.fixed(HOJE.atTime(12, 0).toInstant(ZoneOffset.UTC), ZoneOffset.UTC));

    @AfterEach
    void limpar() {
        ctx.clear();
    }

    @Test
    void gerar_consultasFiltradasPelaEmpresaDoContextoEJanelasCorretas() {
        ctx.setEmpresaId(EMPRESA);
        when(gastoRepo.gastoDiario(anyLong(), any(), any())).thenReturn(List.of());
        when(gastoRepo.gastoMensalPorCategoria(anyLong(), any(), any(), any())).thenReturn(List.of());
        when(gastoRepo.maioresGastos(anyLong(), any(), any(), anyInt())).thenReturn(List.of());

        InsightsResponseDto r = service.gerar(null);

        assertThat(r.mes()).isEqualTo("2026-10");
        // diário: de min(01/07, 14/10 − 89 dias = 17/07) até o fim do mês
        verify(gastoRepo).gastoDiario(EMPRESA, LocalDate.of(2026, 7, 1), LocalDate.of(2026, 10, 31));
        verify(gastoRepo).gastoMensalPorCategoria(EMPRESA, LocalDate.of(2026, 7, 1), LocalDate.of(2026, 10, 31), HOJE);
        verify(gastoRepo).maioresGastos(eq(EMPRESA), eq(LocalDate.of(2026, 10, 1)), eq(LocalDate.of(2026, 10, 31)), eq(5));
    }

    @Test
    void gerar_mesFuturo_janelaDoDiaDaSemanaTerminaHoje() {
        ctx.setEmpresaId(EMPRESA);
        service.gerar(YearMonth.of(2027, 1));

        verify(gastoRepo).gastoDiario(EMPRESA, LocalDate.of(2026, 7, 17), LocalDate.of(2027, 1, 31));
    }

    @Test
    void requer_dashboardVisualizar_noControllerENoService() throws Exception {
        assertThat(InsightsService.class.getMethod("gerar", YearMonth.class).getAnnotation(Requer.class).value())
                .isEqualTo("DASHBOARD_VISUALIZAR");
        assertThat(InsightsController.class.getMethod("gerar", YearMonth.class).getAnnotation(Requer.class).value())
                .isEqualTo("DASHBOARD_VISUALIZAR");
    }
}
