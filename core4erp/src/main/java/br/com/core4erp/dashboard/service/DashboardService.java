package br.com.core4erp.dashboard.service;

import br.com.core4erp.cartaoCredito.repository.CartaoCreditoRepository;
import br.com.core4erp.cartaoCredito.repository.LancamentoCartaoRepository;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.conta.repository.ContaRepository;
import br.com.core4erp.contaCorrente.repository.ContaCorrenteRepository;
import br.com.core4erp.dashboard.dto.DashboardResponseDto;
import br.com.core4erp.dashboard.dto.DashboardResponseDto.DespesaPorCategoriaDto;
import br.com.core4erp.dashboard.dto.DashboardResponseDto.FluxoMensalDto;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.TipoConta;
import br.com.core4erp.investimento.repository.ContaInvestimentoRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class DashboardService {

    private final SecurityContextUtils securityCtx;
    private final ContaCorrenteRepository contaCorrenteRepo;
    private final ContaRepository contaRepo;
    private final ContaInvestimentoRepository investimentoRepo;
    private final CartaoCreditoRepository cartaoRepo;
    private final LancamentoCartaoRepository lancamentoRepo;

    public DashboardService(SecurityContextUtils securityCtx,
                            ContaCorrenteRepository contaCorrenteRepo,
                            ContaRepository contaRepo,
                            ContaInvestimentoRepository investimentoRepo,
                            CartaoCreditoRepository cartaoRepo,
                            LancamentoCartaoRepository lancamentoRepo) {
        this.securityCtx = securityCtx;
        this.contaCorrenteRepo = contaCorrenteRepo;
        this.contaRepo = contaRepo;
        this.investimentoRepo = investimentoRepo;
        this.cartaoRepo = cartaoRepo;
        this.lancamentoRepo = lancamentoRepo;
    }

    /**
     * Agrega os dados financeiros do usuário autenticado em uma única resposta: saldo das contas correntes,
     * totais a pagar/receber, patrimônio em investimentos, limite total e usado de cartões,
     * fluxo mensal dos últimos 6 meses e top-5 despesas por categoria do mês corrente.
     * Todas as somas são feitas via queries agregadas no banco para evitar carregamento em memória.
     */
    @Transactional(readOnly = true)
    public DashboardResponseDto getDashboard() {
        Long uid = securityCtx.getUsuarioId();
        LocalDate hoje = LocalDate.now();
        List<StatusConta> pendentes = List.of(StatusConta.PENDENTE, StatusConta.ATRASADO);

        BigDecimal saldoCC = contaCorrenteRepo.sumSaldoByUsuarioId(uid);

        BigDecimal totalAPagar = contaRepo.sumByTipoAndStatus(uid, TipoConta.PAGAR, pendentes);
        BigDecimal totalAReceber = contaRepo.sumByTipoAndStatus(uid, TipoConta.RECEBER, pendentes);

        BigDecimal patrimonio = investimentoRepo.sumSaldoAtualByUsuarioId(uid);

        BigDecimal limiteTotal = cartaoRepo.sumLimiteByUsuarioId(uid);

        YearMonth now = YearMonth.now();
        YearMonth sixAgo = now.minusMonths(5);
        BigDecimal limiteUsado = lancamentoRepo.sumValorByUsuarioAndPeriod(
                uid,
                sixAgo.getMonthValue(), sixAgo.getYear(),
                now.getMonthValue(), now.getYear());

        LocalDate inicioFluxo = hoje.withDayOfMonth(1).minusMonths(5);
        LocalDate fimFluxo = hoje.withDayOfMonth(hoje.lengthOfMonth());
        Map<YearMonth, ContaRepository.FluxoMensalProjection> fluxoMap =
                contaRepo.fluxoMensal(uid, inicioFluxo, fimFluxo,
                        StatusConta.PAGO, StatusConta.RECEBIDO,
                        List.of(StatusConta.PAGO, StatusConta.RECEBIDO)).stream()
                        .collect(Collectors.toMap(
                                p -> YearMonth.of(p.getAno(), p.getMes()),
                                p -> p));

        List<FluxoMensalDto> fluxoMensal = new ArrayList<>();
        for (int i = 5; i >= 0; i--) {
            YearMonth ym = now.minusMonths(i);
            ContaRepository.FluxoMensalProjection p = fluxoMap.get(ym);
            fluxoMensal.add(new FluxoMensalDto(
                    ym.getMonthValue(), ym.getYear(),
                    p != null ? p.getTotalPago() : BigDecimal.ZERO,
                    p != null ? p.getTotalRecebido() : BigDecimal.ZERO));
        }

        List<DespesaPorCategoriaDto> despesas = contaRepo
                .despesasPorCategoria(uid, TipoConta.PAGAR,
                        List.of(StatusConta.PENDENTE, StatusConta.ATRASADO, StatusConta.PAGO),
                        hoje.getMonthValue(), hoje.getYear(), PageRequest.of(0, 5))
                .stream()
                .map(p -> new DespesaPorCategoriaDto(p.getCategoria(), p.getTotal()))
                .toList();

        Long vencendoHoje = contaRepo.countByStatusAndData(uid, pendentes, hoje);
        Long atrasadas = contaRepo.countByStatusAndDataBefore(uid, pendentes, hoje);

        return new DashboardResponseDto(
                saldoCC, totalAPagar, totalAReceber, patrimonio,
                limiteTotal, limiteUsado,
                fluxoMensal, despesas,
                vencendoHoje, atrasadas);
    }
}
