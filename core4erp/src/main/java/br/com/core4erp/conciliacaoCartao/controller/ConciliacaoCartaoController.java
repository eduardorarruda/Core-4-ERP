package br.com.core4erp.conciliacaoCartao.controller;

import br.com.core4erp.conciliacaoCartao.dto.*;
import br.com.core4erp.conciliacaoCartao.service.ConciliacaoCartaoService;
import br.com.core4erp.config.rbac.Requer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "Conciliação de Cartão", description = "Importação OFX e conciliação automática de lançamentos de cartão")
@RestController
@RequestMapping("/api/cartoes/conciliacao")
public class ConciliacaoCartaoController {

    private final ConciliacaoCartaoService service;

    public ConciliacaoCartaoController(ConciliacaoCartaoService service) {
        this.service = service;
    }

    @Operation(summary = "Upload de OFX de cartão — inicia sessão de conciliação")
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Requer("CARTAO_CONCILIACAO_IMPORTAR")
    public ResponseEntity<ConciliacaoCartaoResponseDto> upload(
            @RequestPart("arquivo") MultipartFile arquivo,
            @RequestParam(required = false) Long cartaoId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.processar(arquivo, cartaoId));
    }

    @Operation(summary = "Listar histórico de conciliações de cartão do usuário")
    @GetMapping
    @Requer("CARTAO_CONCILIACAO_VISUALIZAR")
    public ResponseEntity<List<ConciliacaoCartaoResponseDto>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @Operation(summary = "Buscar sessão de conciliação de cartão com itens")
    @GetMapping("/{id}")
    @Requer("CARTAO_CONCILIACAO_VISUALIZAR")
    public ResponseEntity<ConciliacaoCartaoResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(service.buscar(id));
    }

    @Operation(summary = "Relatório detalhado da conciliação de cartão")
    @GetMapping("/{id}/relatorio")
    @Requer("CARTAO_CONCILIACAO_VISUALIZAR")
    public ResponseEntity<ConciliacaoCartaoRelatorioDto> relatorio(@PathVariable Long id) {
        return ResponseEntity.ok(service.relatorio(id));
    }

    @Operation(summary = "Vincular manualmente item a um lançamento existente")
    @PutMapping("/{id}/itens/{itemId}/vincular")
    @Requer("CARTAO_CONCILIACAO_VINCULAR")
    public ResponseEntity<ConciliacaoCartaoItemResponseDto> vincular(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @Valid @RequestBody VincularLancamentoRequestDto dto) {
        return ResponseEntity.ok(service.vincularItem(id, itemId, dto));
    }

    @Operation(summary = "Criar novo lançamento e vincular ao item")
    @PostMapping("/{id}/itens/{itemId}/novo-lancamento")
    @Requer("CARTAO_CONCILIACAO_VINCULAR")
    public ResponseEntity<ConciliacaoCartaoItemResponseDto> novoLancamento(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @Valid @RequestBody CriarLancamentoParaConciliacaoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.criarLancamentoEVincular(id, itemId, dto));
    }

    @Operation(summary = "Marcar item como ignorado")
    @PutMapping("/{id}/itens/{itemId}/ignorar")
    @Requer("CARTAO_CONCILIACAO_VINCULAR")
    public ResponseEntity<ConciliacaoCartaoItemResponseDto> ignorar(
            @PathVariable Long id,
            @PathVariable Long itemId) {
        return ResponseEntity.ok(service.ignorarItem(id, itemId));
    }

    @Operation(summary = "Desfazer ignorar — volta item IGNORADO para NAO_IDENTIFICADO")
    @PatchMapping("/{id}/itens/{itemId}/desfazer-ignorar")
    @Requer("CARTAO_CONCILIACAO_VINCULAR")
    public ResponseEntity<ConciliacaoCartaoItemResponseDto> desfazerIgnorar(
            @PathVariable Long id,
            @PathVariable Long itemId) {
        return ResponseEntity.ok(service.desfazerIgnorarItem(id, itemId));
    }

    @Operation(summary = "Desvincular item")
    @PutMapping("/{id}/itens/{itemId}/desvincular")
    @Requer("CARTAO_CONCILIACAO_VINCULAR")
    public ResponseEntity<ConciliacaoCartaoItemResponseDto> desvincular(
            @PathVariable Long id,
            @PathVariable Long itemId) {
        return ResponseEntity.ok(service.desvincularItem(id, itemId));
    }

    @Operation(summary = "Finalizar conciliação de cartão")
    @PostMapping("/{id}/finalizar")
    @Requer("CARTAO_CONCILIACAO_VINCULAR")
    public ResponseEntity<ConciliacaoCartaoResponseDto> finalizar(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) FinalizarConciliacaoCartaoRequestDto dto) {
        return ResponseEntity.ok(service.finalizar(id, dto));
    }

    @Operation(summary = "Cancelar sessão de conciliação de cartão pendente")
    @DeleteMapping("/{id}")
    @Requer("CARTAO_CONCILIACAO_VINCULAR")
    public ResponseEntity<Void> cancelar(@PathVariable Long id) {
        service.cancelar(id);
        return ResponseEntity.noContent().build();
    }
}
