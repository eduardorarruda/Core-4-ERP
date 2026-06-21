package br.com.core4erp.chat.tools.relatorio;

import br.com.core4erp.chat.service.ChatAuditoriaService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Map;

@Component
public class RelatorioTools {

    private final RelatorioExcelService excelService;
    private final ChatAuditoriaService auditoria;

    public RelatorioTools(RelatorioExcelService excelService, ChatAuditoriaService auditoria) {
        this.excelService = excelService;
        this.auditoria = auditoria;
    }

    @Tool(description = """
            Gera relatório financeiro Excel (.xlsx) com todas as contas (a pagar e a receber) do
            período, com descrição, valor, vencimento, tipo, status, categoria e parcela.
            Confirme o período com o usuário antes de gerar. O link de download é anexado pelo sistema.
            """)
    public Map<String, String> gerarRelatorioExcel(
            @ToolParam(description = "Data de início do relatório no formato YYYY-MM-DD") LocalDate dataInicio,
            @ToolParam(description = "Data de fim do relatório no formato YYYY-MM-DD") LocalDate dataFim) {
        String fileName = excelService.gerarRelatorioDespesas(dataInicio, dataFim);
        auditoria.registrar("gerarRelatorioExcel",
                "dataInicio=" + dataInicio + " dataFim=" + dataFim);
        String url = "/api/chat/relatorios/" + fileName;
        // Disponibiliza a URL real para o ChatService anexar (evita link inventado pelo modelo)
        RelatorioDownloadHolder.set(url);
        return Map.of(
                "downloadUrl", url,
                "mensagem", "Relatório gerado com sucesso. Disponível para download."
        );
    }
}
