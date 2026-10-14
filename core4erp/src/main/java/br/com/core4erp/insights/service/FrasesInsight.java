package br.com.core4erp.insights.service;

import br.com.core4erp.insights.dto.InsightsResponseDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.CategoriaForaDoNormalDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.DiaSemanaDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.FraseInsightDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.ProjecaoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.RitmoDto;
import br.com.core4erp.utils.MoedaFormatter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.YearMonth;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Frases determinísticas (sem IA) a partir dos números dos Insights. Mesmos números → mesmas frases.
 * Linguagem simples, sem termos técnicos (CLAUDE.md §7 — mensagens ao usuário).
 */
final class FrasesInsight {

    static final String ALERTA = "ALERTA";
    static final String ATENCAO = "ATENCAO";
    static final String POSITIVO = "POSITIVO";
    static final String INFO = "INFO";

    /** Variação de ritmo/projeção abaixo disto (em %) não vira frase — evita ruído. */
    static final BigDecimal MIN_VARIACAO_RELEVANTE = BigDecimal.TEN;
    /** Categoria com variação a partir disto é ALERTA (abaixo, ATENCAO). */
    static final BigDecimal VARIACAO_ALERTA = BigDecimal.valueOf(50);
    static final int MAX_FRASES_CATEGORIA = 3;

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");

    private FrasesInsight() {}

    static List<FraseInsightDto> gerar(InsightsResponseDto d, YearMonth corrente) {
        YearMonth mes = YearMonth.parse(d.mes());
        List<FraseInsightDto> frases = new ArrayList<>();

        if (mes.isAfter(corrente)) {
            BigDecimal agendado = d.projecao().agendadoRestante();
            frases.add(new FraseInsightDto(INFO, agendado.signum() > 0
                    ? "Este mês ainda não começou. Já há " + MoedaFormatter.formatar(agendado) + " em contas agendadas."
                    : "Este mês ainda não começou."));
            return frases;
        }
        boolean encerrado = mes.isBefore(corrente);
        if (d.resumo().totalAteHoje().signum() <= 0 && d.categoriasForaDoNormal().isEmpty()) {
            frases.add(new FraseInsightDto(INFO, encerrado
                    ? "Não há gastos registrados em " + nomeMes(mes) + "."
                    : "Ainda não há gastos registrados neste mês."));
        }
        fraseRitmo(d.ritmo(), mes, d.diaReferencia(), encerrado).ifPresent(frases::add);
        d.categoriasForaDoNormal().stream().limit(MAX_FRASES_CATEGORIA)
                .map(c -> fraseCategoria(c, mes, encerrado)).forEach(frases::add);
        if (!encerrado) fraseProjecao(d.projecao()).ifPresent(frases::add);
        if (!d.maioresGastos().isEmpty()) {
            var maior = d.maioresGastos().get(0);
            frases.add(new FraseInsightDto(INFO, "Seu maior gasto " + (encerrado ? "em " + nomeMes(mes) : "do mês")
                    + " foi " + maior.descricao() + ": " + MoedaFormatter.formatar(maior.valor()) + "."));
        }
        fraseDiaSemana(d.gastoPorDiaDaSemana()).ifPresent(frases::add);
        return List.copyOf(frases);
    }

    static Optional<FraseInsightDto> fraseRitmo(RitmoDto r, YearMonth mes, int dia, boolean encerrado) {
        BigDecimal vsAnterior = r.variacaoVsMesAnterior();
        if (relevante(vsAnterior)) {
            String comparacao = encerrado
                    ? "Em " + nomeMes(mes) + " você gastou " + pct(vsAnterior) + maisOuMenos(vsAnterior)
                      + "que em " + nomeMes(mes.minusMonths(1)) + "."
                    : "Até o dia " + dia + " você gastou " + pct(vsAnterior) + maisOuMenos(vsAnterior)
                      + "que no mesmo ponto do mês passado.";
            return Optional.of(new FraseInsightDto(tipoPorSinal(vsAnterior), comparacao));
        }
        BigDecimal vsMedia = r.variacaoVsMedia3Meses();
        if (relevante(vsMedia)) {
            String comparacao = encerrado
                    ? "Em " + nomeMes(mes) + " você gastou " + pct(vsMedia) + maisOuMenos(vsMedia)
                      + "que a média dos 3 meses anteriores."
                    : "Até o dia " + dia + " você gastou " + pct(vsMedia) + maisOuMenos(vsMedia)
                      + "que a média dos últimos 3 meses no mesmo ponto.";
            return Optional.of(new FraseInsightDto(tipoPorSinal(vsMedia), comparacao));
        }
        return Optional.empty();
    }

    static FraseInsightDto fraseCategoria(CategoriaForaDoNormalDto c, YearMonth mes, boolean encerrado) {
        if (InsightsCalculadora.NOVA.equals(c.tipo())) {
            return new FraseInsightDto(INFO, c.descricao() + " apareceu " + (encerrado ? "em " + nomeMes(mes) : "este mês")
                    + ": " + MoedaFormatter.formatar(c.atual()) + ".");
        }
        String tipo = c.variacaoPercentual().compareTo(VARIACAO_ALERTA) >= 0 ? ALERTA : ATENCAO;
        return new FraseInsightDto(tipo, "Você gastou " + pct(c.variacaoPercentual()) + " a mais com " + c.descricao()
                + " do que na média dos últimos 3 meses.");
    }

    static Optional<FraseInsightDto> fraseProjecao(ProjecaoDto p) {
        if (p.valorProjetado().signum() <= 0) return Optional.empty();
        String base = "Se continuar nesse ritmo, o mês deve fechar em " + MoedaFormatter.formatar(p.valorProjetado());
        BigDecimal v = p.variacaoVsMesAnterior();
        if (!relevante(v)) return Optional.of(new FraseInsightDto(INFO, base + "."));
        String direcao = v.signum() > 0 ? " acima" : " abaixo";
        return Optional.of(new FraseInsightDto(tipoPorSinal(v), base + " — " + pct(v) + direcao + " do mês passado."));
    }

    static Optional<FraseInsightDto> fraseDiaSemana(List<DiaSemanaDto> semana) {
        return semana.stream().filter(DiaSemanaDto::maior).findFirst()
                .map(d -> new FraseInsightDto(INFO, "Nos últimos " + InsightsCalculadora.JANELA_DIA_SEMANA
                        + " dias, " + d.nome() + " foi o dia da semana em que você mais gastou: "
                        + MoedaFormatter.formatar(d.total()) + "."));
    }

    private static boolean relevante(BigDecimal variacao) {
        return variacao != null && variacao.abs().compareTo(MIN_VARIACAO_RELEVANTE) >= 0;
    }

    private static String tipoPorSinal(BigDecimal variacao) {
        return variacao.signum() > 0 ? ATENCAO : POSITIVO;
    }

    private static String maisOuMenos(BigDecimal variacao) {
        return variacao.signum() > 0 ? " a mais " : " a menos ";
    }

    /** Percentual inteiro, sem sinal: "38%". */
    static String pct(BigDecimal variacao) {
        return variacao.abs().setScale(0, RoundingMode.HALF_UP).toPlainString() + "%";
    }

    static String nomeMes(YearMonth mes) {
        return mes.getMonth().getDisplayName(TextStyle.FULL, PT_BR);
    }
}
