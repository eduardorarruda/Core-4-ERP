package br.com.core4erp.insights.service;

import br.com.core4erp.insights.dto.InsightsResponseDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.CategoriaForaDoNormalDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.DiaSemanaDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.MaiorGastoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.PontoRitmoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.ProjecaoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.ResumoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.RitmoDto;
import br.com.core4erp.orcamento.repository.GastoRepository.GastoCategoriaMes;
import br.com.core4erp.orcamento.repository.GastoRepository.GastoDiario;
import br.com.core4erp.orcamento.repository.GastoRepository.GastoIndividual;
import br.com.core4erp.orcamento.service.OrcamentoCalculadora;
import br.com.core4erp.orcamento.service.OrcamentoCalculadora.HistoricoCategoria;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Cálculos puros dos Insights (sem I/O) a partir de 3 agregações já filtradas por empresa:
 * gasto diário, gasto mensal por categoria-raiz e os maiores gastos do mês.
 * Testado em {@code InsightsCalculadoraTest}.
 */
public final class InsightsCalculadora {

    static final int MESES_MEDIA = OrcamentoCalculadora.MESES_MEDIA;
    /** Janela do gráfico "dia da semana" (dias corridos terminando na data de referência). */
    static final int JANELA_DIA_SEMANA = 90;
    /** "Fora do normal": diferença mínima em R$ e variação mínima em % sobre a média de 3 meses. */
    static final BigDecimal MIN_DIFERENCA_FORA_NORMAL = new BigDecimal("50.00");
    static final BigDecimal MIN_VARIACAO_FORA_NORMAL = new BigDecimal("20");
    /** Categoria "nova" (sem histórico) só aparece a partir deste valor — evita ruído. */
    static final BigDecimal MIN_VALOR_CATEGORIA_NOVA = new BigDecimal("50.00");
    static final int MAX_FORA_DO_NORMAL = 5;

    static final String ACIMA_DO_NORMAL = "ACIMA_DO_NORMAL";
    static final String NOVA = "NOVA";

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");
    private static final BigDecimal CEM = BigDecimal.valueOf(100);

    private InsightsCalculadora() {}

    /** Dados de entrada (todos já do tenant). {@code diario} deve cobrir mes-3 … fim do mês e a janela de 90 dias. */
    public record Entrada(YearMonth mes, LocalDate hoje, List<GastoDiario> diario,
                          List<GastoCategoriaMes> mensal, List<GastoIndividual> maiores) {}

    public static InsightsResponseDto calcular(Entrada e) {
        YearMonth mes = e.mes();
        int diaRef = diaReferencia(mes, e.hoje());
        Map<LocalDate, GastoDiario> porDia = e.diario().stream()
                .collect(Collectors.toMap(GastoDiario::data, Function.identity(), (a, b) -> a));

        BigDecimal[] atual = acumulado(mes, porDia);
        BigDecimal[] anterior = acumulado(mes.minusMonths(1), porDia);
        List<BigDecimal[]> tresAnteriores = OrcamentoCalculadora.mesesAnteriores(mes, MESES_MEDIA).stream()
                .map(m -> acumulado(m, porDia)).toList();

        ResumoDto resumo = resumo(mes, diaRef, atual, porDia);
        RitmoDto ritmo = ritmo(mes, diaRef, atual, anterior, tresAnteriores);
        LocalDate fimJanela = diaRef > 0 ? mes.atDay(diaRef) : e.hoje();
        List<DiaSemanaDto> semana = porDiaDaSemana(porDia, fimJanela);
        List<CategoriaForaDoNormalDto> fora = foraDoNormal(e.mensal(), mes);
        List<MaiorGastoDto> maiores = e.maiores().stream()
                .map(g -> new MaiorGastoDto(g.descricao(), g.valor(), g.data(), g.origem(), g.categoria(), g.parceiro()))
                .toList();
        ProjecaoDto projecao = projecao(mes, e.hoje(), diaRef, atual, anterior, acumuladoCartao(mes, porDia));

        InsightsResponseDto base = new InsightsResponseDto(mes.toString(),
                diaRef > 0 ? mes.atDay(diaRef) : null, diaRef, mes.lengthOfMonth(),
                resumo, ritmo, semana, fora, maiores, projecao, List.of());
        return base.comFrases(FrasesInsight.gerar(base, YearMonth.from(e.hoje())));
    }

    /** Dia do mês usado como "hoje": último dia em mês passado, 0 em mês futuro. */
    static int diaReferencia(YearMonth mes, LocalDate hoje) {
        YearMonth corrente = YearMonth.from(hoje);
        if (mes.isBefore(corrente)) return mes.lengthOfMonth();
        if (mes.isAfter(corrente)) return 0;
        return hoje.getDayOfMonth();
    }

    /** acc[d] = gasto de 1..d do mês (acc[0] = 0). */
    static BigDecimal[] acumulado(YearMonth mes, Map<LocalDate, GastoDiario> porDia) {
        int dias = mes.lengthOfMonth();
        BigDecimal[] acc = new BigDecimal[dias + 1];
        acc[0] = BigDecimal.ZERO;
        for (int d = 1; d <= dias; d++) {
            GastoDiario g = porDia.get(mes.atDay(d));
            acc[d] = acc[d - 1].add(g != null ? g.total() : BigDecimal.ZERO);
        }
        return acc;
    }

    /** Igual a {@link #acumulado}, só com a parte de cartão (gasto variável). */
    static BigDecimal[] acumuladoCartao(YearMonth mes, Map<LocalDate, GastoDiario> porDia) {
        int dias = mes.lengthOfMonth();
        BigDecimal[] acc = new BigDecimal[dias + 1];
        acc[0] = BigDecimal.ZERO;
        for (int d = 1; d <= dias; d++) {
            GastoDiario g = porDia.get(mes.atDay(d));
            acc[d] = acc[d - 1].add(g != null ? g.totalCartao() : BigDecimal.ZERO);
        }
        return acc;
    }

    /** Acumulado até o dia (limitado ao tamanho do mês: dia 31 em fevereiro = mês inteiro). */
    static BigDecimal ate(BigDecimal[] acc, int dia) {
        return acc[Math.max(0, Math.min(dia, acc.length - 1))];
    }

    /** (a − b) / b × 100 com 1 casa; null quando a base não é positiva. */
    static BigDecimal variacao(BigDecimal a, BigDecimal b) {
        if (b == null || b.signum() <= 0) return null;
        return a.subtract(b).multiply(CEM).divide(b, 1, RoundingMode.HALF_UP);
    }

    private static BigDecimal mediaAte(List<BigDecimal[]> meses, int dia) {
        return OrcamentoCalculadora.media(meses.stream().map(acc -> ate(acc, dia)).toList());
    }

    static ResumoDto resumo(YearMonth mes, int diaRef, BigDecimal[] atual, Map<LocalDate, GastoDiario> porDia) {
        BigDecimal total = ate(atual, diaRef);
        long quantidade = 0;
        for (int d = 1; d <= diaRef; d++) {
            GastoDiario g = porDia.get(mes.atDay(d));
            if (g != null) quantidade += g.quantidade();
        }
        BigDecimal ticket = quantidade > 0
                ? total.divide(BigDecimal.valueOf(quantidade), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal mediaDiaria = diaRef > 0
                ? total.divide(BigDecimal.valueOf(diaRef), 2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        return new ResumoDto(total, quantidade, ticket, mediaDiaria);
    }

    static RitmoDto ritmo(YearMonth mes, int diaRef, BigDecimal[] atual, BigDecimal[] anterior,
                          List<BigDecimal[]> tresAnteriores) {
        BigDecimal ateHoje = ate(atual, diaRef);
        BigDecimal mesAnterior = ate(anterior, diaRef);
        BigDecimal media3 = mediaAte(tresAnteriores, diaRef);

        List<PontoRitmoDto> curva = new ArrayList<>(mes.lengthOfMonth());
        for (int d = 1; d <= mes.lengthOfMonth(); d++) {
            curva.add(new PontoRitmoDto(d, d <= diaRef ? atual[d] : null, ate(anterior, d), mediaAte(tresAnteriores, d)));
        }
        boolean comparavel = diaRef > 0;
        return new RitmoDto(ateHoje, mesAnterior, media3,
                comparavel ? variacao(ateHoje, mesAnterior) : null,
                comparavel ? variacao(ateHoje, media3) : null,
                curva);
    }

    /** Soma por dia da semana na janela de 90 dias terminando em {@code fim} (inclusive). */
    static List<DiaSemanaDto> porDiaDaSemana(Map<LocalDate, GastoDiario> porDia, LocalDate fim) {
        LocalDate inicio = fim.minusDays(JANELA_DIA_SEMANA - 1L);
        Map<DayOfWeek, BigDecimal> total = new EnumMap<>(DayOfWeek.class);
        Map<DayOfWeek, Long> qtd = new EnumMap<>(DayOfWeek.class);
        for (GastoDiario g : porDia.values()) {
            if (g.data().isBefore(inicio) || g.data().isAfter(fim)) continue;
            total.merge(g.data().getDayOfWeek(), g.total(), BigDecimal::add);
            qtd.merge(g.data().getDayOfWeek(), g.quantidade(), Long::sum);
        }
        BigDecimal maior = total.values().stream().filter(v -> v.signum() > 0)
                .max(Comparator.naturalOrder()).orElse(null);
        List<DiaSemanaDto> lista = new ArrayList<>(7);
        boolean marcado = false;
        for (DayOfWeek dow : DayOfWeek.values()) {
            BigDecimal t = total.getOrDefault(dow, BigDecimal.ZERO);
            boolean ehMaior = !marcado && maior != null && t.compareTo(maior) == 0;
            marcado |= ehMaior;
            lista.add(new DiaSemanaDto(dow.getValue(), dow.getDisplayName(TextStyle.FULL, PT_BR), t,
                    qtd.getOrDefault(dow, 0L), ehMaior));
        }
        return lista;
    }

    /** Categorias acima do normal (vs. média dos 3 meses anteriores) ou novas, maior diferença primeiro. */
    static List<CategoriaForaDoNormalDto> foraDoNormal(List<GastoCategoriaMes> mensal, YearMonth mes) {
        List<YearMonth> anteriores = OrcamentoCalculadora.mesesAnteriores(mes, MESES_MEDIA);
        return OrcamentoCalculadora.agruparPorCategoria(mensal).values().stream()
                .map(h -> avaliarCategoria(h, mes, anteriores))
                .filter(java.util.Objects::nonNull)
                .sorted(Comparator.comparing(CategoriaForaDoNormalDto::diferenca).reversed())
                .limit(MAX_FORA_DO_NORMAL)
                .toList();
    }

    private static CategoriaForaDoNormalDto avaliarCategoria(HistoricoCategoria h, YearMonth mes,
                                                             List<YearMonth> anteriores) {
        BigDecimal atual = h.gastoEm(mes);
        List<BigDecimal> historico = h.gastosEm(anteriores);
        BigDecimal media = OrcamentoCalculadora.media(historico);
        BigDecimal diferenca = atual.subtract(media);

        if (media.signum() <= 0) {
            boolean semHistorico = historico.stream().allMatch(v -> v.signum() <= 0);
            if (!semHistorico || atual.compareTo(MIN_VALOR_CATEGORIA_NOVA) < 0) return null;
            return new CategoriaForaDoNormalDto(h.categoriaId(), h.descricao(), h.icone(),
                    atual, media, diferenca, null, null, NOVA);
        }
        BigDecimal pct = variacao(atual, media);
        if (diferenca.compareTo(MIN_DIFERENCA_FORA_NORMAL) < 0 || pct.compareTo(MIN_VARIACAO_FORA_NORMAL) < 0) {
            return null;
        }
        return new CategoriaForaDoNormalDto(h.categoriaId(), h.descricao(), h.icone(),
                atual, media, diferenca, pct, zScore(atual, media, historico), ACIMA_DO_NORMAL);
    }

    /** (x − média) / desvio-padrão populacional; null quando o histórico não varia. */
    static BigDecimal zScore(BigDecimal x, BigDecimal media, List<BigDecimal> historico) {
        BigDecimal somaQuadrados = historico.stream()
                .map(v -> v.subtract(media).pow(2))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal variancia = somaQuadrados.divide(BigDecimal.valueOf(historico.size()), MathContext.DECIMAL64);
        if (variancia.signum() == 0) return null;
        BigDecimal desvio = variancia.sqrt(MathContext.DECIMAL64);
        return x.subtract(media).divide(desvio, 2, RoundingMode.HALF_UP);
    }

    /**
     * Mês corrente: tudo o que já é conhecido no mês (realizado + contas agendadas pelo vencimento) + o ritmo
     * diário do CARTÃO (gasto variável) × dias restantes. Contas fixas pagas no começo do mês (aluguel,
     * folha) não são extrapoladas — isso inflaria a projeção.
     */
    static ProjecaoDto projecao(YearMonth mes, LocalDate hoje, int diaRef, BigDecimal[] atual, BigDecimal[] anterior,
                                BigDecimal[] cartao) {
        int dias = mes.lengthOfMonth();
        BigDecimal totalMes = atual[dias];
        BigDecimal totalAnterior = anterior[anterior.length - 1];
        YearMonth corrente = YearMonth.from(hoje);

        if (mes.isBefore(corrente)) {
            BigDecimal ritmoDiario = totalMes.divide(BigDecimal.valueOf(dias), 2, RoundingMode.HALF_UP);
            return new ProjecaoDto(totalMes, totalMes, ritmoDiario, BigDecimal.ZERO, totalAnterior,
                    variacao(totalMes, totalAnterior), true);
        }
        if (mes.isAfter(corrente)) {
            return new ProjecaoDto(totalMes, BigDecimal.ZERO, BigDecimal.ZERO, totalMes, totalAnterior,
                    variacao(totalMes, totalAnterior), false);
        }
        BigDecimal ateHoje = atual[diaRef];
        BigDecimal ritmoDiario = cartao[diaRef].divide(BigDecimal.valueOf(diaRef), 2, RoundingMode.HALF_UP);
        BigDecimal agendado = totalMes.subtract(ateHoje);
        BigDecimal projetado = totalMes
                .add(ritmoDiario.multiply(BigDecimal.valueOf(dias - (long) diaRef)))
                .setScale(2, RoundingMode.HALF_UP);
        return new ProjecaoDto(projetado, ateHoje, ritmoDiario, agendado, totalAnterior,
                variacao(projetado, totalAnterior), false);
    }
}
