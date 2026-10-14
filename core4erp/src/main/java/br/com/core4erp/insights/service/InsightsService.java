package br.com.core4erp.insights.service;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.insights.dto.InsightsResponseDto;
import br.com.core4erp.orcamento.repository.GastoRepository;
import br.com.core4erp.utils.MesReferencia;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;

/**
 * Insights do mês: 3 consultas agregadas (gasto diário, gasto mensal por categoria, maiores gastos),
 * todas filtradas por {@code empresaId}; o resto é cálculo puro em {@link InsightsCalculadora}.
 */
@Service
public class InsightsService {

    static final int MAX_MAIORES_GASTOS = 5;

    private final GastoRepository gastoRepo;
    private final TenantContext tenantCtx;
    private final Clock clock;

    @Autowired
    public InsightsService(GastoRepository gastoRepo, TenantContext tenantCtx) {
        this(gastoRepo, tenantCtx, Clock.system(MesReferencia.FUSO));
    }

    InsightsService(GastoRepository gastoRepo, TenantContext tenantCtx, Clock clock) {
        this.gastoRepo = gastoRepo;
        this.tenantCtx = tenantCtx;
        this.clock = clock;
    }

    @Requer("DASHBOARD_VISUALIZAR")
    @Transactional(readOnly = true)
    public InsightsResponseDto gerar(YearMonth mesParam) {
        Long eid = tenantCtx.getEmpresaId();
        LocalDate hoje = LocalDate.now(clock);
        YearMonth mes = MesReferencia.resolver(mesParam, hoje);

        LocalDate inicioMes = mes.atDay(1);
        LocalDate fimMes = mes.atEndOfMonth();
        LocalDate inicioHistorico = mes.minusMonths(InsightsCalculadora.MESES_MEDIA).atDay(1);

        // Janela do "dia da semana": 90 dias terminando no dia de referência (hoje em mês futuro).
        int diaRef = InsightsCalculadora.diaReferencia(mes, hoje);
        LocalDate fimJanela = diaRef > 0 ? mes.atDay(diaRef) : hoje;
        LocalDate inicioJanela = fimJanela.minusDays(InsightsCalculadora.JANELA_DIA_SEMANA - 1L);
        LocalDate inicioDiario = inicioJanela.isBefore(inicioHistorico) ? inicioJanela : inicioHistorico;
        LocalDate fimDiario = fimJanela.isAfter(fimMes) ? fimJanela : fimMes;

        return InsightsCalculadora.calcular(new InsightsCalculadora.Entrada(
                mes, hoje,
                gastoRepo.gastoDiario(eid, inicioDiario, fimDiario),
                gastoRepo.gastoMensalPorCategoria(eid, inicioHistorico, fimMes, hoje),
                gastoRepo.maioresGastos(eid, inicioMes, fimMes, MAX_MAIORES_GASTOS)));
    }
}
