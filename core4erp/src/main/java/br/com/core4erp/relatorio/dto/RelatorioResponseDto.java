package br.com.core4erp.relatorio.dto;

import java.util.List;
import java.util.Map;

public record RelatorioResponseDto(
        GraficoDto grafico,
        List<String> cabecalho,
        List<List<Object>> linhas,
        List<Object> totais
) {
    public record GraficoDto(
            List<String> labels,
            Map<String, List<Number>> series
    ) {}
}
