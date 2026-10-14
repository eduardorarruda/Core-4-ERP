package br.com.core4erp.chat.tools.consulta;

import br.com.core4erp.cartaoCredito.dto.ParcelamentoResponseDto;
import br.com.core4erp.cartaoCredito.dto.ParcelamentoResponseDto.ProximaParcelaDto;
import br.com.core4erp.insights.dto.InsightsResponseDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.CategoriaForaDoNormalDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.FraseInsightDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.MaiorGastoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.ProjecaoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.ResumoDto;
import br.com.core4erp.insights.dto.InsightsResponseDto.RitmoDto;
import br.com.core4erp.orcamento.dto.OrcamentoItemResponseDto;
import br.com.core4erp.orcamento.dto.OrcamentoMesResponseDto;
import br.com.core4erp.orcamento.enums.StatusOrcamento;
import br.com.core4erp.utils.MoedaFormatter;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;

/**
 * Texto compacto (pt-BR) para o modelo a partir dos DTOs de Orçamento, Insights e Parcelamentos.
 * Só formata: nenhum cálculo de negócio aqui — os números vêm prontos dos services.
 */
final class AnaliseFinanceiraFormatter {

    static final int MAX_MAIORES_GASTOS = 3;
    static final int MAX_PROXIMAS_PARCELAS = 1;

    private static final DateTimeFormatter BR_DATA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private AnaliseFinanceiraFormatter() {}

    // ── Orçamentos ───────────────────────────────────────────────────────────

    static String orcamentos(OrcamentoMesResponseDto o) {
        StringBuilder sb = new StringBuilder();
        List<OrcamentoItemResponseDto> itens = o.itens() == null ? List.of() : o.itens();
        if (itens.isEmpty()) {
            sb.append("Nenhum orçamento definido (mês ").append(o.mes()).append(").");
            appendSemOrcamento(sb, o.gastoSemOrcamento());
            return sb.toString();
        }
        sb.append("Orçamentos de ").append(o.mes())
                .append(" (mês decorrido: ").append(percentual(o.ritmo())).append(")\n")
                .append("Total: gasto ").append(moeda(o.totalGasto()))
                .append(" de ").append(moeda(o.totalLimite()))
                .append(" (").append(percentual(o.percentualTotal())).append(")")
                .append(" | restante ").append(moeda(subtrair(o.totalLimite(), o.totalGasto())));
        appendSemOrcamento(sb, o.gastoSemOrcamento());
        itens.forEach(i -> sb.append('\n').append(itemOrcamento(i)));
        return sb.toString();
    }

    private static String itemOrcamento(OrcamentoItemResponseDto i) {
        String categoria = i.categoria() != null ? i.categoria().descricao() : "Sem categoria";
        StringBuilder sb = new StringBuilder("- ").append(categoria)
                .append(": limite ").append(moeda(i.limite()))
                .append(" | gasto ").append(moeda(i.gasto()))
                .append(" (").append(percentual(i.percentual())).append(")")
                .append(" | restante ").append(moeda(i.restante()))
                .append(" | status ").append(status(i.status()));
        if (i.projecao() != null && i.gasto() != null && i.projecao().compareTo(i.gasto()) != 0) {
            sb.append(" | projeção ").append(moeda(i.projecao()));
        }
        return sb.toString();
    }

    private static void appendSemOrcamento(StringBuilder sb, BigDecimal semOrcamento) {
        if (semOrcamento != null && semOrcamento.signum() > 0) {
            sb.append("\nGasto em categorias sem orçamento: ").append(moeda(semOrcamento));
        }
    }

    static String status(StatusOrcamento status) {
        if (status == null) return "—";
        return switch (status) {
            case OK -> "OK";
            case ATENCAO -> "ATENÇÃO (gasto acima do ritmo do mês)";
            case ESTOURADO -> "ESTOURADO (passou do limite)";
        };
    }

    // ── Insights ─────────────────────────────────────────────────────────────

    static String insights(InsightsResponseDto d) {
        StringBuilder sb = new StringBuilder("Insights de ").append(d.mes());
        if (d.diaReferencia() > 0) {
            sb.append(" (até o dia ").append(d.diaReferencia()).append(" de ").append(d.diasNoMes()).append(")");
        } else {
            sb.append(" (mês ainda não começou)");
        }
        appendResumo(sb, d.resumo());
        appendRitmo(sb, d.ritmo());
        appendProjecao(sb, d.projecao());
        appendForaDoNormal(sb, d.categoriasForaDoNormal());
        appendMaioresGastos(sb, d.maioresGastos());
        appendFrases(sb, d.frases());
        return sb.toString();
    }

    private static void appendResumo(StringBuilder sb, ResumoDto r) {
        if (r == null) return;
        sb.append("\nResumo: ").append(moeda(r.totalAteHoje())).append(" em ").append(r.quantidade())
                .append(" gasto(s) | ticket médio ").append(moeda(r.ticketMedio()))
                .append(" | média diária ").append(moeda(r.mediaDiaria()));
    }

    private static void appendRitmo(StringBuilder sb, RitmoDto r) {
        if (r == null) return;
        sb.append("\nRitmo: até hoje ").append(moeda(r.gastoAteHoje()))
                .append(" | mesmo período do mês anterior ").append(moeda(r.mesmoPeriodoMesAnterior()))
                .append(variacao(r.variacaoVsMesAnterior()))
                .append(" | média do mesmo período (3 meses) ").append(moeda(r.mediaMesmoPeriodo3Meses()))
                .append(variacao(r.variacaoVsMedia3Meses()));
    }

    private static void appendProjecao(StringBuilder sb, ProjecaoDto p) {
        if (p == null) return;
        sb.append(p.mesEncerrado() ? "\nTotal do mês (encerrado): " : "\nProjeção de fechamento: ")
                .append(moeda(p.valorProjetado()))
                .append(" | mês anterior ").append(moeda(p.totalMesAnterior()))
                .append(variacao(p.variacaoVsMesAnterior()));
        if (!p.mesEncerrado() && p.agendadoRestante() != null && p.agendadoRestante().signum() > 0) {
            sb.append(" | já agendado ").append(moeda(p.agendadoRestante()));
        }
    }

    private static void appendForaDoNormal(StringBuilder sb, List<CategoriaForaDoNormalDto> categorias) {
        if (categorias == null || categorias.isEmpty()) {
            sb.append("\nCategorias fora do normal: nenhuma");
            return;
        }
        sb.append("\nCategorias fora do normal:");
        categorias.forEach(c -> sb.append("\n- ").append(c.descricao()).append(": ").append(moeda(c.atual()))
                .append("NOVA".equals(c.tipo())
                        ? " (nova — sem gasto nos 3 meses anteriores)"
                        : " vs média " + moeda(c.media3Meses()) + variacao(c.variacaoPercentual())));
    }

    private static void appendMaioresGastos(StringBuilder sb, List<MaiorGastoDto> gastos) {
        if (gastos == null || gastos.isEmpty()) return;
        sb.append("\nMaiores gastos:");
        gastos.stream().limit(MAX_MAIORES_GASTOS).forEach(g -> sb.append("\n- ").append(g.descricao())
                .append(": ").append(moeda(g.valor())).append(" em ").append(data(g.data()))
                .append("CARTAO".equals(g.origem()) ? " (cartão)" : " (conta)"));
    }

    private static void appendFrases(StringBuilder sb, List<FraseInsightDto> frases) {
        if (frases == null || frases.isEmpty()) return;
        sb.append("\nLeituras:");
        frases.forEach(f -> sb.append("\n- [").append(f.tipo()).append("] ").append(f.texto()));
    }

    // ── Parcelamentos ────────────────────────────────────────────────────────

    static String parcelamentos(List<ParcelamentoResponseDto> lista) {
        if (lista == null || lista.isEmpty()) {
            return "Você não tem compras parceladas em andamento no cartão.";
        }
        BigDecimal totalRestante = lista.stream().map(ParcelamentoResponseDto::valorRestante)
                .filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add);
        StringBuilder sb = new StringBuilder("Compras parceladas em andamento: ").append(lista.size())
                .append(" | total ainda a pagar ").append(moeda(totalRestante));
        lista.forEach(p -> sb.append('\n').append(parcelamento(p)));
        return sb.toString();
    }

    private static String parcelamento(ParcelamentoResponseDto p) {
        StringBuilder sb = new StringBuilder("- ").append(p.descricao());
        if (p.parceiro() != null && !p.parceiro().isBlank()) sb.append(" (").append(p.parceiro()).append(")");
        if (p.cartao() != null) sb.append(" no cartão ").append(p.cartao().nome());
        sb.append(": parcela ").append(p.parcelaAtual()).append('/').append(p.totalParcelas())
                .append(" de ").append(moeda(p.valorParcela()))
                .append(" | total ").append(moeda(p.valorTotal()))
                .append(" | faltam ").append(p.parcelasRestantes())
                .append(" (").append(moeda(p.valorRestante())).append(")")
                .append(" | termina na fatura ").append(p.terminaEm());
        List<ProximaParcelaDto> proximas = p.proximasParcelas() == null ? List.of() : p.proximasParcelas();
        proximas.stream().limit(MAX_PROXIMAS_PARCELAS).forEach(px -> {
            sb.append(" | próxima: fatura ").append(px.fatura());
            if (px.dataVencimento() != null) sb.append(", vence ").append(data(px.dataVencimento()));
        });
        return sb.toString();
    }

    // ── Auxiliares ───────────────────────────────────────────────────────────

    static String moeda(BigDecimal valor) {
        return MoedaFormatter.formatar(valor);
    }

    /** "85,3%" — uma casa decimal, sem ",0". Null vira "—". */
    static String percentual(BigDecimal valor) {
        if (valor == null) return "—";
        BigDecimal v = valor.setScale(1, RoundingMode.HALF_UP).stripTrailingZeros();
        if (v.scale() < 0) v = v.setScale(0, RoundingMode.UNNECESSARY);
        return v.toPlainString().replace('.', ',') + "%";
    }

    /** " (+12,5%)" / " (-3%)"; vazio quando não há base de comparação. */
    static String variacao(BigDecimal valor) {
        if (valor == null) return "";
        return " (" + (valor.signum() > 0 ? "+" : "") + percentual(valor) + ")";
    }

    private static String data(LocalDate d) {
        return d == null ? "—" : d.format(BR_DATA);
    }

    private static BigDecimal subtrair(BigDecimal a, BigDecimal b) {
        return (a == null ? BigDecimal.ZERO : a).subtract(b == null ? BigDecimal.ZERO : b);
    }
}
