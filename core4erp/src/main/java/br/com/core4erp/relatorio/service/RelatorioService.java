package br.com.core4erp.relatorio.service;

import br.com.core4erp.assinatura.entity.Assinatura;
import br.com.core4erp.assinatura.repository.AssinaturaRepository;
import br.com.core4erp.cartaoCredito.entity.LancamentoCartao;
import br.com.core4erp.cartaoCredito.repository.LancamentoCartaoRepository;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.entity.ContaBaixada;
import br.com.core4erp.conta.repository.ContaBaixadaRepository;
import br.com.core4erp.conta.repository.ContaRepository;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.TipoConta;
import br.com.core4erp.enums.TipoTransacaoInvestimento;
import br.com.core4erp.investimento.entity.TransacaoInvestimento;
import br.com.core4erp.investimento.repository.TransacaoInvestimentoRepository;
import br.com.core4erp.relatorio.dto.RelatorioResponseDto;
import br.com.core4erp.relatorio.dto.RelatorioResponseDto.GraficoDto;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class RelatorioService {

    private static final DateTimeFormatter LABEL_FMT = DateTimeFormatter.ofPattern("MMM/yyyy", new Locale("pt", "BR"));
    private static final List<StatusConta> PAGOS = List.of(StatusConta.PAGO, StatusConta.RECEBIDO);
    private static final List<StatusConta> ABERTOS = List.of(StatusConta.PENDENTE, StatusConta.ATRASADO);

    private final SecurityContextUtils securityCtx;
    private final ContaRepository contaRepo;
    private final ContaBaixadaRepository baixadaRepo;
    private final TransacaoInvestimentoRepository transacaoRepo;
    private final LancamentoCartaoRepository lancamentoRepo;
    private final AssinaturaRepository assinaturaRepo;

    public RelatorioService(SecurityContextUtils securityCtx,
                            ContaRepository contaRepo,
                            ContaBaixadaRepository baixadaRepo,
                            TransacaoInvestimentoRepository transacaoRepo,
                            LancamentoCartaoRepository lancamentoRepo,
                            AssinaturaRepository assinaturaRepo) {
        this.securityCtx = securityCtx;
        this.contaRepo = contaRepo;
        this.baixadaRepo = baixadaRepo;
        this.transacaoRepo = transacaoRepo;
        this.lancamentoRepo = lancamentoRepo;
        this.assinaturaRepo = assinaturaRepo;
    }

    // ── Fluxo de Caixa ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RelatorioResponseDto getDadosFluxoCaixa(
            LocalDate inicio, LocalDate fim,
            TipoConta tipo, Long categoriaId, Long parceiroId) {

        Long uid = securityCtx.getUsuarioId();
        List<Conta> contas = contaRepo
                .findByUsuarioIdAndStatusInAndDataVencimentoBetweenOrderByDataVencimento(uid, PAGOS, inicio, fim);

        contas = filtrarContas(contas, tipo, categoriaId, parceiroId);

        List<YearMonth> meses = mesesEntreDatas(inicio, fim);
        List<String> labels = meses.stream().map(m -> m.format(LABEL_FMT)).toList();

        Map<YearMonth, BigDecimal> entradas = zeroMap(meses);
        Map<YearMonth, BigDecimal> saidas   = zeroMap(meses);

        for (Conta c : contas) {
            YearMonth ym = YearMonth.from(c.getDataVencimento());
            if (c.getTipo() == TipoConta.RECEBER) entradas.merge(ym, c.getValorOriginal(), BigDecimal::add);
            else                                   saidas.merge(ym, c.getValorOriginal(), BigDecimal::add);
        }

        Map<String, List<Number>> series = new LinkedHashMap<>();
        series.put("Entradas", toNumberList(meses, entradas));
        series.put("Saídas",   toNumberList(meses, saidas));

        List<String> cabecalho = List.of("Período", "Entradas (R$)", "Saídas (R$)", "Resultado (R$)");
        List<List<Object>> linhas = new ArrayList<>();
        BigDecimal totalE = BigDecimal.ZERO, totalS = BigDecimal.ZERO;

        for (YearMonth ym : meses) {
            BigDecimal e = entradas.get(ym), s = saidas.get(ym);
            totalE = totalE.add(e); totalS = totalS.add(s);
            linhas.add(List.of(ym.format(LABEL_FMT), e.doubleValue(), s.doubleValue(), e.subtract(s).doubleValue()));
        }

        List<Object> totais = List.of("Total", totalE.doubleValue(), totalS.doubleValue(),
                totalE.subtract(totalS).doubleValue());

        return new RelatorioResponseDto(new GraficoDto(labels, series), cabecalho, linhas, totais);
    }

    // ── Contas Abertas ───────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RelatorioResponseDto getDadosContasAbertas(
            LocalDate inicio, LocalDate fim,
            TipoConta tipo, StatusConta status, Long categoriaId, Long parceiroId) {

        Long uid = securityCtx.getUsuarioId();
        List<StatusConta> statuses = status != null ? List.of(status) : ABERTOS;
        List<Conta> contas = contaRepo
                .findByUsuarioIdAndStatusInAndDataVencimentoBetweenOrderByDataVencimento(uid, statuses, inicio, fim);

        contas = filtrarContas(contas, tipo, categoriaId, parceiroId);

        List<YearMonth> meses = mesesEntreDatas(inicio, fim);
        List<String> labels = meses.stream().map(m -> m.format(LABEL_FMT)).toList();

        Map<YearMonth, BigDecimal> pagar   = zeroMap(meses);
        Map<YearMonth, BigDecimal> receber = zeroMap(meses);

        for (Conta c : contas) {
            YearMonth ym = YearMonth.from(c.getDataVencimento());
            if (c.getTipo() == TipoConta.PAGAR) pagar.merge(ym, c.getValorOriginal(), BigDecimal::add);
            else                                receber.merge(ym, c.getValorOriginal(), BigDecimal::add);
        }

        Map<String, List<Number>> series = new LinkedHashMap<>();
        series.put("A Pagar",   toNumberList(meses, pagar));
        series.put("A Receber", toNumberList(meses, receber));

        List<String> cabecalho = List.of("Descrição", "Vencimento", "Tipo", "Valor (R$)", "Status", "Categoria", "Parceiro");
        List<List<Object>> linhas = new ArrayList<>();
        BigDecimal totalP = BigDecimal.ZERO, totalR = BigDecimal.ZERO;

        for (Conta c : contas) {
            String cat = c.getCategoria() != null ? c.getCategoria().getDescricao() : "-";
            String par = c.getParceiro() != null ? nomeParceiro(c) : "-";
            linhas.add(List.of(c.getDescricao(), c.getDataVencimento().toString(),
                    c.getTipo().name(), c.getValorOriginal().doubleValue(),
                    c.getStatus().name(), cat, par));
            if (c.getTipo() == TipoConta.PAGAR) totalP = totalP.add(c.getValorOriginal());
            else                                totalR = totalR.add(c.getValorOriginal());
        }

        List<Object> totais = List.of("Total", "", "",
                totalP.add(totalR).doubleValue(), "", "", "");

        return new RelatorioResponseDto(new GraficoDto(labels, series), cabecalho, linhas, totais);
    }

    // ── Extrato ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RelatorioResponseDto getDadosExtrato(
            LocalDate inicio, LocalDate fim,
            TipoConta tipo, Long contaCorrenteId, Long categoriaId) {

        Long uid = securityCtx.getUsuarioId();
        List<ContaBaixada> baixadas = baixadaRepo
                .findByUsuarioIdAndDataPagamentoBetweenOrderByDataPagamento(uid, inicio, fim);

        if (tipo != null)
            baixadas = baixadas.stream().filter(cb -> cb.getConta().getTipo() == tipo).toList();
        if (contaCorrenteId != null)
            baixadas = baixadas.stream()
                    .filter(cb -> cb.getContaCorrente() != null
                            && cb.getContaCorrente().getId().equals(contaCorrenteId)).toList();
        if (categoriaId != null)
            baixadas = baixadas.stream()
                    .filter(cb -> cb.getConta().getCategoria() != null
                            && cb.getConta().getCategoria().getId().equals(categoriaId)).toList();

        List<YearMonth> meses = mesesEntreDatas(inicio, fim);
        List<String> labels = meses.stream().map(m -> m.format(LABEL_FMT)).toList();

        Map<YearMonth, BigDecimal> pagamentos   = zeroMap(meses);
        Map<YearMonth, BigDecimal> recebimentos = zeroMap(meses);

        for (ContaBaixada cb : baixadas) {
            YearMonth ym = YearMonth.from(cb.getDataPagamento());
            if (cb.getConta().getTipo() == TipoConta.PAGAR) pagamentos.merge(ym, cb.getValorFinal(), BigDecimal::add);
            else                                             recebimentos.merge(ym, cb.getValorFinal(), BigDecimal::add);
        }

        Map<String, List<Number>> series = new LinkedHashMap<>();
        series.put("Pagamentos",   toNumberList(meses, pagamentos));
        series.put("Recebimentos", toNumberList(meses, recebimentos));

        List<String> cabecalho = List.of("Data", "Descrição", "Tipo", "Conta Corrente", "Categoria", "Valor (R$)");
        List<List<Object>> linhas = new ArrayList<>();
        BigDecimal totalPag = BigDecimal.ZERO, totalRec = BigDecimal.ZERO;

        for (ContaBaixada cb : baixadas) {
            String contaDesc = cb.getContaCorrente() != null ? cb.getContaCorrente().getDescricao() : "-";
            String cat = cb.getConta().getCategoria() != null ? cb.getConta().getCategoria().getDescricao() : "-";
            linhas.add(List.of(cb.getDataPagamento().toString(), cb.getConta().getDescricao(),
                    cb.getConta().getTipo().name(), contaDesc, cat, cb.getValorFinal().doubleValue()));
            if (cb.getConta().getTipo() == TipoConta.PAGAR) totalPag = totalPag.add(cb.getValorFinal());
            else                                             totalRec = totalRec.add(cb.getValorFinal());
        }

        List<Object> totais = List.of("Total", "", "", "", "Saldo",
                totalRec.subtract(totalPag).doubleValue());

        return new RelatorioResponseDto(new GraficoDto(labels, series), cabecalho, linhas, totais);
    }

    // ── DRE ─────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RelatorioResponseDto getDadosDre(LocalDate inicio, LocalDate fim, TipoConta tipo) {

        Long uid = securityCtx.getUsuarioId();
        List<StatusConta> statuses;
        if (tipo == TipoConta.RECEBER)     statuses = List.of(StatusConta.RECEBIDO);
        else if (tipo == TipoConta.PAGAR)  statuses = List.of(StatusConta.PAGO);
        else                               statuses = PAGOS;

        List<Conta> contas = contaRepo
                .findByUsuarioIdAndStatusInAndDataVencimentoBetweenOrderByDataVencimento(uid, statuses, inicio, fim);

        Map<String, BigDecimal> receitas = new TreeMap<>();
        Map<String, BigDecimal> despesas = new TreeMap<>();

        for (Conta c : contas) {
            String cat = c.getCategoria() != null ? c.getCategoria().getDescricao() : "Sem categoria";
            if (c.getTipo() == TipoConta.RECEBER) receitas.merge(cat, c.getValorOriginal(), BigDecimal::add);
            else                                   despesas.merge(cat, c.getValorOriginal(), BigDecimal::add);
        }

        Set<String> todasCats = new TreeSet<>();
        todasCats.addAll(receitas.keySet());
        todasCats.addAll(despesas.keySet());
        List<String> labels = new ArrayList<>(todasCats);

        Map<String, List<Number>> series = new LinkedHashMap<>();
        series.put("Receitas", labels.stream().map(l -> (Number) receitas.getOrDefault(l, BigDecimal.ZERO).doubleValue()).toList());
        series.put("Despesas", labels.stream().map(l -> (Number) despesas.getOrDefault(l, BigDecimal.ZERO).doubleValue()).toList());

        List<String> cabecalho = List.of("Categoria", "Receitas (R$)", "Despesas (R$)", "Resultado (R$)");
        List<List<Object>> linhas = new ArrayList<>();
        BigDecimal totalR = BigDecimal.ZERO, totalD = BigDecimal.ZERO;

        for (String cat : todasCats) {
            BigDecimal r = receitas.getOrDefault(cat, BigDecimal.ZERO);
            BigDecimal d = despesas.getOrDefault(cat, BigDecimal.ZERO);
            totalR = totalR.add(r); totalD = totalD.add(d);
            linhas.add(List.of(cat, r.doubleValue(), d.doubleValue(), r.subtract(d).doubleValue()));
        }

        List<Object> totais = List.of("Total", totalR.doubleValue(), totalD.doubleValue(),
                totalR.subtract(totalD).doubleValue());

        return new RelatorioResponseDto(new GraficoDto(labels, series), cabecalho, linhas, totais);
    }

    // ── Investimentos ────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RelatorioResponseDto getDadosInvestimentos(
            LocalDate inicio, LocalDate fim,
            TipoTransacaoInvestimento tipoTransacao, Long contaInvestimentoId) {

        Long uid = securityCtx.getUsuarioId();
        List<TransacaoInvestimento> transacoes = transacaoRepo
                .findByUsuarioIdAndDataTransacaoBetweenOrderByDataTransacao(uid, inicio, fim);

        if (tipoTransacao != null)
            transacoes = transacoes.stream().filter(t -> t.getTipoTransacao() == tipoTransacao).toList();
        if (contaInvestimentoId != null)
            transacoes = transacoes.stream()
                    .filter(t -> t.getContaInvestimento().getId().equals(contaInvestimentoId)).toList();

        List<YearMonth> meses = mesesEntreDatas(inicio, fim);
        List<String> labels = meses.stream().map(m -> m.format(LABEL_FMT)).toList();

        Map<YearMonth, BigDecimal> aportes    = zeroMap(meses);
        Map<YearMonth, BigDecimal> resgates   = zeroMap(meses);
        Map<YearMonth, BigDecimal> rendimentos = zeroMap(meses);

        for (TransacaoInvestimento t : transacoes) {
            YearMonth ym = YearMonth.from(t.getDataTransacao());
            switch (t.getTipoTransacao()) {
                case APORTE     -> aportes.merge(ym, t.getValor(), BigDecimal::add);
                case RESGATE    -> resgates.merge(ym, t.getValor(), BigDecimal::add);
                case RENDIMENTO -> rendimentos.merge(ym, t.getValor(), BigDecimal::add);
            }
        }

        Map<String, List<Number>> series = new LinkedHashMap<>();
        series.put("Aportes",     toNumberList(meses, aportes));
        series.put("Resgates",    toNumberList(meses, resgates));
        series.put("Rendimentos", toNumberList(meses, rendimentos));

        List<String> cabecalho = List.of("Data", "Carteira", "Tipo Transação", "Valor (R$)");
        List<List<Object>> linhas = new ArrayList<>();
        BigDecimal totalA = BigDecimal.ZERO, totalRes = BigDecimal.ZERO, totalRend = BigDecimal.ZERO;

        for (TransacaoInvestimento t : transacoes) {
            linhas.add(List.of(t.getDataTransacao().toString(), t.getContaInvestimento().getNome(),
                    t.getTipoTransacao().name(), t.getValor().doubleValue()));
            switch (t.getTipoTransacao()) {
                case APORTE     -> totalA    = totalA.add(t.getValor());
                case RESGATE    -> totalRes  = totalRes.add(t.getValor());
                case RENDIMENTO -> totalRend = totalRend.add(t.getValor());
            }
        }

        BigDecimal resultado = totalA.subtract(totalRes).add(totalRend);
        List<Object> totais = List.of(
                "Aportes: R$" + fmt(totalA) + " | Resgates: R$" + fmt(totalRes)
                        + " | Rendimentos: R$" + fmt(totalRend),
                "", "", resultado.doubleValue());

        return new RelatorioResponseDto(new GraficoDto(labels, series), cabecalho, linhas, totais);
    }

    // ── Posição Financeira ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RelatorioResponseDto getDadosPosicaoFinanceira(LocalDate inicio, LocalDate fim) {
        Long uid = securityCtx.getUsuarioId();

        List<ContaBaixada> baixadas = baixadaRepo
                .findByUsuarioIdAndDataPagamentoBetweenOrderByDataPagamento(uid, inicio, fim);
        List<TransacaoInvestimento> transacoes = transacaoRepo
                .findByUsuarioIdAndDataTransacaoBetweenOrderByDataTransacao(uid, inicio, fim);

        BigDecimal totalPago = baixadas.stream()
                .filter(b -> b.getConta().getTipo() == TipoConta.PAGAR)
                .map(ContaBaixada::getValorFinal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRecebido = baixadas.stream()
                .filter(b -> b.getConta().getTipo() == TipoConta.RECEBER)
                .map(ContaBaixada::getValorFinal).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalAportado = transacoes.stream()
                .filter(t -> t.getTipoTransacao() == TipoTransacaoInvestimento.APORTE)
                .map(TransacaoInvestimento::getValor).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalResgatado = transacoes.stream()
                .filter(t -> t.getTipoTransacao() == TipoTransacaoInvestimento.RESGATE)
                .map(TransacaoInvestimento::getValor).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalRendimento = transacoes.stream()
                .filter(t -> t.getTipoTransacao() == TipoTransacaoInvestimento.RENDIMENTO)
                .map(TransacaoInvestimento::getValor).reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal entradasTotal = totalRecebido.add(totalResgatado);
        BigDecimal saidasTotal   = totalPago.add(totalAportado);
        BigDecimal saldoLiquido  = entradasTotal.subtract(saidasTotal);

        List<YearMonth> meses = mesesEntreDatas(inicio, fim);
        List<String> labels = meses.stream().map(m -> m.format(LABEL_FMT)).toList();

        Map<YearMonth, BigDecimal> mapPago     = zeroMap(meses);
        Map<YearMonth, BigDecimal> mapRecebido = zeroMap(meses);
        Map<YearMonth, BigDecimal> mapAporte   = zeroMap(meses);
        Map<YearMonth, BigDecimal> mapResgate  = zeroMap(meses);

        baixadas.forEach(b -> {
            YearMonth ym = YearMonth.from(b.getDataPagamento());
            if (!mapPago.containsKey(ym)) return;
            if (b.getConta().getTipo() == TipoConta.PAGAR)
                mapPago.merge(ym, b.getValorFinal(), BigDecimal::add);
            else
                mapRecebido.merge(ym, b.getValorFinal(), BigDecimal::add);
        });

        transacoes.forEach(t -> {
            YearMonth ym = YearMonth.from(t.getDataTransacao());
            if (!mapAporte.containsKey(ym)) return;
            if (t.getTipoTransacao() == TipoTransacaoInvestimento.APORTE)
                mapAporte.merge(ym, t.getValor(), BigDecimal::add);
            else if (t.getTipoTransacao() == TipoTransacaoInvestimento.RESGATE)
                mapResgate.merge(ym, t.getValor(), BigDecimal::add);
        });

        Map<String, List<Number>> series = new LinkedHashMap<>();
        series.put("Recebido", toNumberList(meses, mapRecebido));
        series.put("Pago",     toNumberList(meses, mapPago));
        series.put("Aporte",   toNumberList(meses, mapAporte));
        series.put("Resgate",  toNumberList(meses, mapResgate));

        List<String> cabecalho = List.of("Componente", "Valor (R$)", "Tipo", "Observação");
        List<List<Object>> linhas = new ArrayList<>();
        linhas.add(List.of("Contas Recebidas",    totalRecebido.doubleValue(),  "Entrada", "Contas status=RECEBIDO no período"));
        linhas.add(List.of("Resgates de Invest.", totalResgatado.doubleValue(), "Entrada", "Resgates de investimento no período"));
        linhas.add(List.of("Rendimentos",         totalRendimento.doubleValue(),"Neutro",  "Rendimentos creditados no período"));
        linhas.add(List.of("Contas Pagas",        totalPago.doubleValue(),      "Saída",   "Contas status=PAGO no período"));
        linhas.add(List.of("Aportes em Invest.",  totalAportado.doubleValue(),  "Saída",   "Aportes enviados a investimentos"));

        List<Object> totais = List.of(
                "Saldo Líquido do Período",
                saldoLiquido.doubleValue(),
                saldoLiquido.compareTo(BigDecimal.ZERO) >= 0 ? "Positivo" : "Negativo",
                String.format("Entradas R$ %.2f | Saídas R$ %.2f", entradasTotal.doubleValue(), saidasTotal.doubleValue()));

        return new RelatorioResponseDto(new GraficoDto(labels, series), cabecalho, linhas, totais);
    }

    // ── Assinaturas ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RelatorioResponseDto getDadosAssinaturas(Boolean soAtivas) {
        Long uid = securityCtx.getUsuarioId();
        List<Assinatura> lista = (soAtivas == null || soAtivas)
                ? assinaturaRepo.findAllByUsuarioIdAndAtiva(uid, true)
                : assinaturaRepo.findAllByUsuarioId(uid);

        Map<String, BigDecimal> porCategoria = new LinkedHashMap<>();
        BigDecimal totalAtivas = BigDecimal.ZERO;

        List<String> cabecalho = List.of("Descrição", "Valor Mensal (R$)", "Dia Vencimento", "Categoria", "Parceiro", "Status");
        List<List<Object>> linhas = new ArrayList<>();

        for (Assinatura a : lista) {
            String cat = a.getCategoria().getDescricao();
            String par = a.getParceiro() != null
                    ? (a.getParceiro().getNomeFantasia() != null && !a.getParceiro().getNomeFantasia().isBlank()
                        ? a.getParceiro().getNomeFantasia() : a.getParceiro().getRazaoSocial())
                    : "-";
            String status = Boolean.TRUE.equals(a.getAtiva()) ? "Ativa" : "Inativa";
            linhas.add(List.of(a.getDescricao(), a.getValor().doubleValue(), a.getDiaVencimento(), cat, par, status));
            porCategoria.merge(cat, a.getValor(), BigDecimal::add);
            if (Boolean.TRUE.equals(a.getAtiva())) totalAtivas = totalAtivas.add(a.getValor());
        }

        List<String> labels = new ArrayList<>(porCategoria.keySet());
        Map<String, List<Number>> series = new LinkedHashMap<>();
        series.put("Valor", labels.stream().map(l -> (Number) porCategoria.get(l).doubleValue()).toList());

        List<Object> totais = List.of("TOTAL ATIVO", totalAtivas.doubleValue(), "", "", "", "");

        return new RelatorioResponseDto(new GraficoDto(labels, series), cabecalho, linhas, totais);
    }

    // ── Cartões de Crédito ───────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RelatorioResponseDto getDadosCartoes(
            LocalDate inicio, LocalDate fim,
            Long cartaoId, Long categoriaId) {

        Long uid = securityCtx.getUsuarioId();
        YearMonth ymInicio = YearMonth.from(inicio);
        YearMonth ymFim    = YearMonth.from(fim);

        List<LancamentoCartao> lancamentos = lancamentoRepo.findByUsuarioIdAndFaturaPeriod(
                uid, ymInicio.getMonthValue(), ymInicio.getYear(),
                ymFim.getMonthValue(), ymFim.getYear());

        if (cartaoId != null)
            lancamentos = lancamentos.stream()
                    .filter(l -> l.getCartaoCredito().getId().equals(cartaoId)).toList();
        if (categoriaId != null)
            lancamentos = lancamentos.stream()
                    .filter(l -> l.getCategoria() != null
                            && l.getCategoria().getId().equals(categoriaId)).toList();

        List<YearMonth> meses = mesesEntreDatas(inicio, fim);
        List<String> labels = meses.stream().map(m -> m.format(LABEL_FMT)).toList();

        Map<YearMonth, BigDecimal> gastosPorMes = zeroMap(meses);
        for (LancamentoCartao l : lancamentos) {
            YearMonth ym = YearMonth.of(l.getAnoFatura(), l.getMesFatura());
            gastosPorMes.merge(ym, l.getValor(), BigDecimal::add);
        }

        Map<String, List<Number>> series = new LinkedHashMap<>();
        series.put("Gastos", toNumberList(meses, gastosPorMes));

        List<String> cabecalho = List.of("Data Compra", "Cartão", "Descrição", "Categoria", "Parcela", "Valor (R$)");
        List<List<Object>> linhas = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;

        for (LancamentoCartao l : lancamentos) {
            String parcela = l.getTotalParcelas() != null && l.getTotalParcelas() > 1
                    ? l.getNumeroParcela() + "/" + l.getTotalParcelas() : "-";
            String cat = l.getCategoria() != null ? l.getCategoria().getDescricao() : "-";
            linhas.add(List.of(l.getDataCompra().toString(), l.getCartaoCredito().getNome(),
                    l.getDescricao(), cat, parcela, l.getValor().doubleValue()));
            total = total.add(l.getValor());
        }

        List<Object> totais = List.of("Total", "", "", "", "", total.doubleValue());

        return new RelatorioResponseDto(new GraficoDto(labels, series), cabecalho, linhas, totais);
    }

    // ── Excel ────────────────────────────────────────────────────────────────

    public Resource gerarExcel(RelatorioResponseDto dados, String titulo, LocalDate inicio, LocalDate fim) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Relatório");

            CellStyle headerStyle = wb.createCellStyle();
            Font hFont = wb.createFont();
            hFont.setBold(true);
            headerStyle.setFont(hFont);

            CellStyle titleStyle = wb.createCellStyle();
            Font tFont = wb.createFont();
            tFont.setBold(true);
            tFont.setFontHeightInPoints((short) 13);
            titleStyle.setFont(tFont);

            int row = 0;
            Row titleRow = sheet.createRow(row++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(inicio != null ? titulo + " — " + inicio + " a " + fim : titulo);
            titleCell.setCellStyle(titleStyle);
            row++;

            Row headerRow = sheet.createRow(row++);
            List<String> cab = dados.cabecalho();
            for (int i = 0; i < cab.size(); i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(cab.get(i));
                c.setCellStyle(headerStyle);
            }

            for (List<Object> linha : dados.linhas()) {
                Row dataRow = sheet.createRow(row++);
                for (int i = 0; i < linha.size(); i++) {
                    Object val = linha.get(i);
                    Cell c = dataRow.createCell(i);
                    if (val instanceof Number n) c.setCellValue(n.doubleValue());
                    else c.setCellValue(String.valueOf(val));
                }
            }

            if (dados.totais() != null && !dados.totais().isEmpty()) {
                Row totRow = sheet.createRow(row);
                for (int i = 0; i < dados.totais().size(); i++) {
                    Object val = dados.totais().get(i);
                    Cell c = totRow.createCell(i);
                    c.setCellStyle(headerStyle);
                    if (val instanceof Number n) c.setCellValue(n.doubleValue());
                    else c.setCellValue(String.valueOf(val));
                }
            }

            for (int i = 0; i < cab.size(); i++) sheet.autoSizeColumn(i);

            wb.write(out);
            return new ByteArrayResource(out.toByteArray());
        } catch (IOException e) {
            throw new RuntimeException("Erro ao gerar Excel", e);
        }
    }

    // ── Utilitários ──────────────────────────────────────────────────────────

    private List<Conta> filtrarContas(List<Conta> contas, TipoConta tipo, Long categoriaId, Long parceiroId) {
        if (tipo != null)
            contas = contas.stream().filter(c -> c.getTipo() == tipo).toList();
        if (categoriaId != null)
            contas = contas.stream()
                    .filter(c -> c.getCategoria() != null && c.getCategoria().getId().equals(categoriaId)).toList();
        if (parceiroId != null)
            contas = contas.stream()
                    .filter(c -> c.getParceiro() != null && c.getParceiro().getId().equals(parceiroId)).toList();
        return contas;
    }

    private List<YearMonth> mesesEntreDatas(LocalDate inicio, LocalDate fim) {
        List<YearMonth> meses = new ArrayList<>();
        YearMonth atual = YearMonth.from(inicio), ultimo = YearMonth.from(fim);
        while (!atual.isAfter(ultimo)) { meses.add(atual); atual = atual.plusMonths(1); }
        return meses;
    }

    private Map<YearMonth, BigDecimal> zeroMap(List<YearMonth> meses) {
        Map<YearMonth, BigDecimal> map = new LinkedHashMap<>();
        meses.forEach(m -> map.put(m, BigDecimal.ZERO));
        return map;
    }

    private List<Number> toNumberList(List<YearMonth> meses, Map<YearMonth, BigDecimal> map) {
        return meses.stream().map(m -> (Number) map.get(m).doubleValue()).toList();
    }

    private String nomeParceiro(Conta c) {
        var p = c.getParceiro();
        return p.getNomeFantasia() != null && !p.getNomeFantasia().isBlank()
                ? p.getNomeFantasia() : p.getRazaoSocial();
    }

    private String fmt(BigDecimal v) {
        return String.format("%.2f", v);
    }
}
