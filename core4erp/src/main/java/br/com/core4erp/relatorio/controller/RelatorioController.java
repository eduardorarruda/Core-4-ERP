package br.com.core4erp.relatorio.controller;

import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.TipoConta;
import br.com.core4erp.enums.TipoTransacaoInvestimento;
import br.com.core4erp.relatorio.dto.RelatorioResponseDto;
import br.com.core4erp.relatorio.service.RelatorioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@Tag(name = "Relatórios", description = "Relatórios financeiros em JSON (visualização) e XLSX (download)")
@RestController
@RequestMapping("/api/relatorios")
public class RelatorioController {

    private static final String XLSX_TYPE =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final RelatorioService relatorioService;

    public RelatorioController(RelatorioService relatorioService) {
        this.relatorioService = relatorioService;
    }

    // ── Fluxo de Caixa ───────────────────────────────────────────────────────

    @Operation(summary = "Dados JSON do Fluxo de Caixa")
    @GetMapping("/fluxo-caixa/dados")
    public ResponseEntity<RelatorioResponseDto> fluxoCaixaDados(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) TipoConta tipo,
            @RequestParam(required = false) Long categoriaId,
            @RequestParam(required = false) Long parceiroId) {
        return ResponseEntity.ok(relatorioService.getDadosFluxoCaixa(inicio, fim, tipo, categoriaId, parceiroId));
    }

    @Operation(summary = "Download XLSX do Fluxo de Caixa")
    @GetMapping("/fluxo-caixa")
    public ResponseEntity<Resource> fluxoCaixaExcel(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) TipoConta tipo,
            @RequestParam(required = false) Long categoriaId,
            @RequestParam(required = false) Long parceiroId) {
        RelatorioResponseDto dados = relatorioService.getDadosFluxoCaixa(inicio, fim, tipo, categoriaId, parceiroId);
        Resource resource = relatorioService.gerarExcel(dados, "Fluxo de Caixa", inicio, fim);
        return xlsxResponse(resource, "fluxo-caixa", inicio, fim);
    }

    // ── Contas Abertas ───────────────────────────────────────────────────────

    @Operation(summary = "Dados JSON das Contas Abertas")
    @GetMapping("/contas-abertas/dados")
    public ResponseEntity<RelatorioResponseDto> contasAbertasDados(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) TipoConta tipo,
            @RequestParam(required = false) StatusConta status,
            @RequestParam(required = false) Long categoriaId,
            @RequestParam(required = false) Long parceiroId) {
        return ResponseEntity.ok(relatorioService.getDadosContasAbertas(inicio, fim, tipo, status, categoriaId, parceiroId));
    }

    @Operation(summary = "Download XLSX das Contas Abertas")
    @GetMapping("/contas-abertas")
    public ResponseEntity<Resource> contasAbertasExcel(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) TipoConta tipo,
            @RequestParam(required = false) StatusConta status,
            @RequestParam(required = false) Long categoriaId,
            @RequestParam(required = false) Long parceiroId) {
        RelatorioResponseDto dados = relatorioService.getDadosContasAbertas(inicio, fim, tipo, status, categoriaId, parceiroId);
        Resource resource = relatorioService.gerarExcel(dados, "Contas Abertas", inicio, fim);
        return xlsxResponse(resource, "contas-abertas", inicio, fim);
    }

    // ── Extrato ──────────────────────────────────────────────────────────────

    @Operation(summary = "Dados JSON do Extrato")
    @GetMapping("/extrato/dados")
    public ResponseEntity<RelatorioResponseDto> extratoDados(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) TipoConta tipo,
            @RequestParam(required = false) Long contaCorrenteId,
            @RequestParam(required = false) Long categoriaId) {
        return ResponseEntity.ok(relatorioService.getDadosExtrato(inicio, fim, tipo, contaCorrenteId, categoriaId));
    }

    @Operation(summary = "Download XLSX do Extrato")
    @GetMapping("/extrato")
    public ResponseEntity<Resource> extratoExcel(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) TipoConta tipo,
            @RequestParam(required = false) Long contaCorrenteId,
            @RequestParam(required = false) Long categoriaId) {
        RelatorioResponseDto dados = relatorioService.getDadosExtrato(inicio, fim, tipo, contaCorrenteId, categoriaId);
        Resource resource = relatorioService.gerarExcel(dados, "Extrato", inicio, fim);
        return xlsxResponse(resource, "extrato", inicio, fim);
    }

    // ── DRE ─────────────────────────────────────────────────────────────────

    @Operation(summary = "Dados JSON da DRE")
    @GetMapping("/dre/dados")
    public ResponseEntity<RelatorioResponseDto> dreDados(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) TipoConta tipo) {
        return ResponseEntity.ok(relatorioService.getDadosDre(inicio, fim, tipo));
    }

    @Operation(summary = "Download XLSX da DRE")
    @GetMapping("/dre")
    public ResponseEntity<Resource> dreExcel(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) TipoConta tipo) {
        RelatorioResponseDto dados = relatorioService.getDadosDre(inicio, fim, tipo);
        Resource resource = relatorioService.gerarExcel(dados, "DRE", inicio, fim);
        return xlsxResponse(resource, "dre", inicio, fim);
    }

    // ── Investimentos ────────────────────────────────────────────────────────

    @Operation(summary = "Dados JSON de Investimentos")
    @GetMapping("/investimentos/dados")
    public ResponseEntity<RelatorioResponseDto> investimentosDados(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) TipoTransacaoInvestimento tipoTransacao,
            @RequestParam(required = false) Long contaInvestimentoId) {
        return ResponseEntity.ok(relatorioService.getDadosInvestimentos(inicio, fim, tipoTransacao, contaInvestimentoId));
    }

    @Operation(summary = "Download XLSX de Investimentos")
    @GetMapping("/investimentos")
    public ResponseEntity<Resource> investimentosExcel(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) TipoTransacaoInvestimento tipoTransacao,
            @RequestParam(required = false) Long contaInvestimentoId) {
        RelatorioResponseDto dados = relatorioService.getDadosInvestimentos(inicio, fim, tipoTransacao, contaInvestimentoId);
        Resource resource = relatorioService.gerarExcel(dados, "Investimentos", inicio, fim);
        return xlsxResponse(resource, "investimentos", inicio, fim);
    }

    // ── Cartões de Crédito ───────────────────────────────────────────────────

    @Operation(summary = "Dados JSON de Cartões de Crédito")
    @GetMapping("/cartoes/dados")
    public ResponseEntity<RelatorioResponseDto> cartoesDados(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) Long cartaoId,
            @RequestParam(required = false) Long categoriaId) {
        return ResponseEntity.ok(relatorioService.getDadosCartoes(inicio, fim, cartaoId, categoriaId));
    }

    @Operation(summary = "Download XLSX de Cartões de Crédito")
    @GetMapping("/cartoes")
    public ResponseEntity<Resource> cartoesExcel(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim,
            @RequestParam(required = false) Long cartaoId,
            @RequestParam(required = false) Long categoriaId) {
        RelatorioResponseDto dados = relatorioService.getDadosCartoes(inicio, fim, cartaoId, categoriaId);
        Resource resource = relatorioService.gerarExcel(dados, "Cartões de Crédito", inicio, fim);
        return xlsxResponse(resource, "cartoes", inicio, fim);
    }

    // ── Posição Financeira ───────────────────────────────────────────────────

    @Operation(summary = "Dados JSON da Posição Financeira Completa")
    @GetMapping("/posicao-financeira/dados")
    public ResponseEntity<RelatorioResponseDto> posicaoFinanceiraDados(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        return ResponseEntity.ok(relatorioService.getDadosPosicaoFinanceira(inicio, fim));
    }

    @Operation(summary = "Download XLSX da Posição Financeira Completa")
    @GetMapping("/posicao-financeira")
    public ResponseEntity<Resource> posicaoFinanceiraExcel(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate inicio,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fim) {
        RelatorioResponseDto dados = relatorioService.getDadosPosicaoFinanceira(inicio, fim);
        Resource resource = relatorioService.gerarExcel(dados, "Posição Financeira Completa", inicio, fim);
        return xlsxResponse(resource, "posicao-financeira", inicio, fim);
    }

    // ── Helper ───────────────────────────────────────────────────────────────

    private ResponseEntity<Resource> xlsxResponse(Resource resource, String nome, LocalDate inicio, LocalDate fim) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(XLSX_TYPE))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + nome + "_" + inicio + "_" + fim + ".xlsx\"")
                .body(resource);
    }
}
