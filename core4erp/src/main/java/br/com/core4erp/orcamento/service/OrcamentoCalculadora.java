package br.com.core4erp.orcamento.service;

import br.com.core4erp.orcamento.enums.StatusOrcamento;
import br.com.core4erp.orcamento.repository.GastoRepository.GastoCategoriaMes;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Regras puras do orçamento (sem I/O) — testadas isoladamente em {@code OrcamentoCalculadoraTest}.
 * Dinheiro sempre em {@link BigDecimal} (2 casas, HALF_UP); percentuais com 2 casas.
 */
public final class OrcamentoCalculadora {

    /** Quantos meses COMPLETOS anteriores entram na média/sugestão. */
    public static final int MESES_MEDIA = 3;
    /** A sugestão de limite é arredondada para cima neste múltiplo (R$). */
    static final int MULTIPLO_SUGESTAO = 10;

    private static final BigDecimal CEM = BigDecimal.valueOf(100);
    private static final int ESCALA_FRACAO = 6;

    private OrcamentoCalculadora() {}

    /** Quanto do mês já passou: 1 em mês passado, 0 em mês futuro, dia/dias no mês corrente. */
    public static BigDecimal fracaoDoMes(YearMonth mes, LocalDate hoje) {
        YearMonth atual = YearMonth.from(hoje);
        if (mes.isBefore(atual)) return BigDecimal.ONE;
        if (mes.isAfter(atual)) return BigDecimal.ZERO;
        return BigDecimal.valueOf(hoje.getDayOfMonth())
                .divide(BigDecimal.valueOf(mes.lengthOfMonth()), ESCALA_FRACAO, RoundingMode.HALF_UP);
    }

    /** Ritmo em %: onde o gasto "deveria" estar hoje para fechar o mês exatamente no limite. */
    public static BigDecimal ritmoPercentual(YearMonth mes, LocalDate hoje) {
        return fracaoDoMes(mes, hoje).multiply(CEM).setScale(2, RoundingMode.HALF_UP);
    }

    /** gasto / limite × 100 (2 casas). Limite zero/negativo → 0 (não deveria existir: CHECK no banco). */
    public static BigDecimal percentual(BigDecimal gasto, BigDecimal limite) {
        if (limite == null || limite.signum() <= 0) return BigDecimal.ZERO.setScale(2);
        return gasto.multiply(CEM).divide(limite, 2, RoundingMode.HALF_UP);
    }

    public static BigDecimal esperadoAteHoje(BigDecimal limite, YearMonth mes, LocalDate hoje) {
        return limite.multiply(fracaoDoMes(mes, hoje)).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Status: ESTOURADO se o gasto do mês (inclui contas já agendadas) &gt; limite; no mês corrente,
     * ATENCAO se o gasto REALIZADO até hoje &gt; esperado até hoje (passou do marcador de ritmo); OK caso
     * contrário. Contas com vencimento futuro não disparam ATENCAO (ainda não foram gastas); em mês
     * futuro só ESTOURADO se aplica.
     */
    public static StatusOrcamento status(BigDecimal gasto, BigDecimal gastoAteHoje, BigDecimal limite,
                                         YearMonth mes, LocalDate hoje) {
        if (gasto.compareTo(limite) > 0) return StatusOrcamento.ESTOURADO;
        if (mes.equals(YearMonth.from(hoje)) && gastoAteHoje.compareTo(esperadoAteHoje(limite, mes, hoje)) > 0) {
            return StatusOrcamento.ATENCAO;
        }
        return StatusOrcamento.OK;
    }

    /**
     * Onde o mês fecha (mês corrente): gasto do mês (contas pelo vencimento já são conhecidas, inclusive as
     * futuras) + o cartão realizado até hoje projetado no ritmo atual até o fim do mês
     * ({@code cartaoAteHoje / fração − cartaoAteHoje}). Extrapolar contas fixas pagas no começo do mês
     * (aluguel, folha) inflaria a projeção. Nos demais meses: o próprio gasto.
     */
    public static BigDecimal projecao(BigDecimal gasto, BigDecimal cartaoAteHoje, YearMonth mes, LocalDate hoje) {
        BigDecimal fracao = fracaoDoMes(mes, hoje);
        if (fracao.signum() == 0 || fracao.compareTo(BigDecimal.ONE) >= 0) return gasto.setScale(2, RoundingMode.HALF_UP);
        BigDecimal cartaoNoFim = cartaoAteHoje.divide(fracao, 2, RoundingMode.HALF_UP);
        return gasto.add(cartaoNoFim).subtract(cartaoAteHoje).setScale(2, RoundingMode.HALF_UP);
    }

    /** Média simples dos meses informados (meses sem gasto contam como zero). */
    public static BigDecimal media(List<BigDecimal> valores) {
        if (valores.isEmpty()) return BigDecimal.ZERO.setScale(2);
        BigDecimal soma = valores.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return soma.divide(BigDecimal.valueOf(valores.size()), 2, RoundingMode.HALF_UP);
    }

    /**
     * Sugestão de limite: média dos últimos meses completos, arredondada para cima em múltiplos de
     * {@value #MULTIPLO_SUGESTAO}. Sem gasto no período → {@code null} (nada a sugerir).
     */
    public static BigDecimal sugestaoLimite(List<BigDecimal> ultimosMeses) {
        BigDecimal media = media(ultimosMeses);
        if (media.signum() <= 0) return null;
        return arredondarParaCima(media, MULTIPLO_SUGESTAO);
    }

    /**
     * Sugestão para "gastos sem limite": média dos meses anteriores; sem histórico (categoria nova),
     * usa o gasto do mês atual arredondado. {@code null} quando não houve gasto algum.
     */
    public static BigDecimal sugestaoParaCategoriaSemLimite(List<BigDecimal> ultimosMeses, BigDecimal gastoMes) {
        BigDecimal pelaMedia = sugestaoLimite(ultimosMeses);
        if (pelaMedia != null) return pelaMedia;
        return gastoMes.signum() > 0 ? arredondarParaCima(gastoMes, MULTIPLO_SUGESTAO) : null;
    }

    static BigDecimal arredondarParaCima(BigDecimal valor, int multiplo) {
        BigDecimal m = BigDecimal.valueOf(multiplo);
        return valor.divide(m, 0, RoundingMode.CEILING).multiply(m).setScale(2, RoundingMode.UNNECESSARY);
    }

    /** Os {@code n} meses completos anteriores a {@code mes}, do mais recente para o mais antigo. */
    public static List<YearMonth> mesesAnteriores(YearMonth mes, int n) {
        return java.util.stream.IntStream.rangeClosed(1, n).mapToObj(mes::minusMonths).toList();
    }

    /** Gasto de um mês: total (inclui agendado), realizado até hoje e a parte de cartão até hoje. */
    public record GastoMes(BigDecimal total, BigDecimal ateHoje, BigDecimal cartaoAteHoje) {
        static final GastoMes VAZIO = new GastoMes(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);

        GastoMes somar(GastoMes o) {
            return new GastoMes(total.add(o.total), ateHoje.add(o.ateHoje), cartaoAteHoje.add(o.cartaoAteHoje));
        }
    }

    /** Histórico mensal de gasto por categoria-raiz (resultado de {@code gastoMensalPorCategoria}). */
    public record HistoricoCategoria(Long categoriaId, String descricao, String icone,
                                     Map<YearMonth, GastoMes> porMes) {
        public GastoMes em(YearMonth mes) {
            return porMes.getOrDefault(mes, GastoMes.VAZIO);
        }

        public BigDecimal gastoEm(YearMonth mes) {
            return em(mes).total();
        }

        public List<BigDecimal> gastosEm(List<YearMonth> meses) {
            return meses.stream().map(this::gastoEm).toList();
        }
    }

    /** Agrupa as linhas (categoria × mês) por categoria, preservando a ordem de chegada. */
    public static Map<Long, HistoricoCategoria> agruparPorCategoria(List<GastoCategoriaMes> linhas) {
        Map<Long, HistoricoCategoria> mapa = new LinkedHashMap<>();
        for (GastoCategoriaMes l : linhas) {
            HistoricoCategoria h = mapa.computeIfAbsent(l.categoriaId(),
                    id -> new HistoricoCategoria(id, l.descricao(), l.icone(), new HashMap<>()));
            h.porMes().merge(YearMonth.of(l.ano(), l.mes()),
                    new GastoMes(l.total(), l.totalAte(), l.cartaoAte()), GastoMes::somar);
        }
        return mapa;
    }
}
