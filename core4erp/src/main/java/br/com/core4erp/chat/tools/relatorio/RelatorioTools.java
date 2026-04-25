package br.com.core4erp.chat.tools.relatorio;

import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.Map;

@Component
public class RelatorioTools {

    private final RelatorioExcelService excelService;

    public RelatorioTools(RelatorioExcelService excelService) {
        this.excelService = excelService;
    }

    @Tool(description = """
            Gera um relatório financeiro em formato Excel (.xlsx) para download.
            O relatório contém todas as contas (a pagar e a receber) do período
            informado, com descrição, valor, vencimento, tipo, status, categoria
            e parcela. Retorna a URL de download do arquivo.
            Confirme o período com o usuário antes de gerar.
            """)
    public Map<String, String> gerarRelatorioExcel(
            @ToolParam(description = "Data de início do relatório no formato YYYY-MM-DD") LocalDate dataInicio,
            @ToolParam(description = "Data de fim do relatório no formato YYYY-MM-DD") LocalDate dataFim) {
        String fileName = excelService.gerarRelatorioDespesas(dataInicio, dataFim);
        return Map.of(
                "downloadUrl", "/api/chat/relatorios/" + fileName,
                "mensagem", "Relatório gerado com sucesso. Disponível para download."
        );
    }
}
