package br.com.core4erp.chat.tools.consulta;

import br.com.core4erp.cartaoCredito.service.ParcelamentoCartaoService;
import br.com.core4erp.exception.AcessoNegadoException;
import br.com.core4erp.insights.service.InsightsService;
import br.com.core4erp.orcamento.service.OrcamentoService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.time.YearMonth;
import java.time.format.DateTimeParseException;
import java.util.function.Function;
import java.util.function.Supplier;

/**
 * Ferramentas de LEITURA da Áurea para Orçamento, Insights e Parcelamentos. Nomes começam com
 * "consultar" — o {@code GateEscritaAnexoAspect} as trata como leitura (liberadas em turno com anexo)
 * e não há {@code @AcaoCritica}. Tenant e RBAC ficam nos services ({@code TenantContext} + {@code @Requer});
 * sem permissão, a tool devolve uma mensagem amigável em vez de um erro técnico.
 * O retorno é texto compacto (valores já em R$ pt-BR) para economizar tokens.
 */
@Component
public class AnaliseFinanceiraTools {

    static final String MES_INVALIDO =
            "Mês inválido. Informe no formato AAAA-MM (ex.: 2026-05) ou omita para usar o mês atual.";

    private final OrcamentoService orcamentoService;
    private final InsightsService insightsService;
    private final ParcelamentoCartaoService parcelamentoService;

    public AnaliseFinanceiraTools(OrcamentoService orcamentoService,
                                  InsightsService insightsService,
                                  ParcelamentoCartaoService parcelamentoService) {
        this.orcamentoService = orcamentoService;
        this.insightsService = insightsService;
        this.parcelamentoService = parcelamentoService;
    }

    @Tool(description = """
            Orçamentos do mês por categoria: limite, gasto, percentual usado, restante e status
            (OK, ATENÇÃO = gastando acima do ritmo do mês, ESTOURADO = passou do limite), além do total
            e do gasto em categorias sem orçamento. Use para "como está meu orçamento", "estourei algum
            limite", "quanto ainda posso gastar em X".
            """)
    public String consultarOrcamentos(
            @ToolParam(required = false, description = "Mês no formato AAAA-MM (opcional; padrão: mês atual)")
            String mes) {
        return comMes(mes, "os orçamentos",
                ym -> AnaliseFinanceiraFormatter.orcamentos(orcamentoService.listar(ym)));
    }

    @Tool(description = """
            Insights automáticos do mês: ritmo de gasto comparado ao mesmo período do mês anterior e à
            média dos 3 meses, projeção de fechamento, categorias fora do normal, maiores gastos e
            leituras prontas. Use para "estou gastando mais que o normal?", "como vai fechar o mês",
            "o que mudou nos meus gastos".
            """)
    public String consultarInsights(
            @ToolParam(required = false, description = "Mês no formato AAAA-MM (opcional; padrão: mês atual)")
            String mes) {
        return comMes(mes, "os insights",
                ym -> AnaliseFinanceiraFormatter.insights(insightsService.gerar(ym)));
    }

    @Tool(description = """
            Compras parceladas no cartão ainda em andamento: parcela atual/total, valor da parcela,
            quantas faltam, quanto falta pagar, quando termina e a próxima fatura. Use para "quais
            parcelamentos eu tenho", "quanto ainda devo de parcelas".
            """)
    public String consultarParcelamentos() {
        return comPermissao("os parcelamentos",
                () -> AnaliseFinanceiraFormatter.parcelamentos(parcelamentoService.listarAtivos()));
    }

    // ── Auxiliares ───────────────────────────────────────────────────────────

    private String comMes(String mes, String assunto, Function<YearMonth, String> consulta) {
        YearMonth ym;
        try {
            ym = parseMes(mes);
        } catch (DateTimeParseException e) {
            return MES_INVALIDO;
        }
        return comPermissao(assunto, () -> consulta.apply(ym));
    }

    private static String comPermissao(String assunto, Supplier<String> consulta) {
        try {
            return consulta.get();
        } catch (AcessoNegadoException e) {
            // PermissaoAspect já registrou o evento de segurança; ao modelo vai só a mensagem amigável.
            return semPermissao(assunto);
        } catch (IllegalArgumentException e) {
            // MesReferencia: ano fora da faixa aceita — mensagem já é amigável.
            return e.getMessage();
        }
    }

    static String semPermissao(String assunto) {
        return "O usuário não tem permissão para ver " + assunto
                + ". Explique isso com gentileza e oriente a pedir acesso ao administrador da empresa."
                + " Não tente outra ferramenta para obter o mesmo dado.";
    }

    /** Null/vazio = mês atual (o service resolve); aceita "AAAA-MM". */
    static YearMonth parseMes(String mes) {
        if (mes == null || mes.isBlank()) return null;
        return YearMonth.parse(mes.trim());
    }
}
