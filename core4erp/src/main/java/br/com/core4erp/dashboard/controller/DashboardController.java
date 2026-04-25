package br.com.core4erp.dashboard.controller;

import br.com.core4erp.dashboard.dto.DashboardResponseDto;
import br.com.core4erp.dashboard.dto.SaldoDetalhadoResponseDto;
import br.com.core4erp.dashboard.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Dashboard", description = "Agregação financeira consolidada do usuário")
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @Operation(summary = "Retorna saldos, totais, fluxo mensal e despesas por categoria")
    @GetMapping
    public ResponseEntity<DashboardResponseDto> getDashboard() {
        return ResponseEntity.ok(service.getDashboard());
    }

    @Operation(summary = "Retorna saldo detalhado com composição, projeções e cartão")
    @GetMapping("/saldo-detalhado")
    public ResponseEntity<SaldoDetalhadoResponseDto> getSaldoDetalhado() {
        return ResponseEntity.ok(service.getSaldoDetalhado());
    }
}
