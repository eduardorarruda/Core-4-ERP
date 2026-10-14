package br.com.core4erp.insights.controller;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.insights.dto.InsightsResponseDto;
import br.com.core4erp.insights.service.InsightsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;

@Tag(name = "Insights", description = "Leituras automáticas do mês: ritmo, fora do normal, projeção")
@RestController
@RequestMapping("/api/insights")
public class InsightsController {

    private final InsightsService insightsService;

    public InsightsController(InsightsService insightsService) {
        this.insightsService = insightsService;
    }

    @Operation(summary = "Insights do mês (ritmo, dia da semana, categorias fora do normal, projeção e frases)")
    @GetMapping
    @Requer("DASHBOARD_VISUALIZAR")
    public ResponseEntity<InsightsResponseDto> gerar(
            @Parameter(description = "Mês no formato AAAA-MM (padrão: mês atual)")
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth mes) {
        return ResponseEntity.ok(insightsService.gerar(mes));
    }
}
