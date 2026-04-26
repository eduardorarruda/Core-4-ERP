package br.com.core4erp.conciliacao.controller;

import br.com.core4erp.conciliacao.dto.*;
import br.com.core4erp.conciliacao.service.ConciliacaoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "Conciliação Bancária", description = "Importação OFX e conciliação automática com lançamentos")
@RestController
@RequestMapping("/api/conciliacao")
public class ConciliacaoController {

    private final ConciliacaoService service;

    public ConciliacaoController(ConciliacaoService service) {
        this.service = service;
    }

    @Operation(summary = "Upload de arquivo OFX — inicia sessão de conciliação")
    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ConciliacaoResponseDto> upload(
            @RequestPart("arquivo") MultipartFile arquivo,
            @RequestParam(required = false) Long contaCorrenteId) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.processar(arquivo, contaCorrenteId));
    }

    @Operation(summary = "Listar histórico de conciliações do usuário")
    @GetMapping
    public ResponseEntity<List<ConciliacaoResponseDto>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @Operation(summary = "Buscar sessão de conciliação com todos os itens")
    @GetMapping("/{id}")
    public ResponseEntity<ConciliacaoResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(service.buscar(id));
    }

    @Operation(summary = "Relatório detalhado da conciliação")
    @GetMapping("/{id}/relatorio")
    public ResponseEntity<ConciliacaoRelatorioDto> relatorio(@PathVariable Long id) {
        return ResponseEntity.ok(service.relatorio(id));
    }

    @Operation(summary = "Vincular manualmente um item a uma conta existente")
    @PutMapping("/{id}/itens/{itemId}/vincular")
    public ResponseEntity<ConciliacaoItemResponseDto> vincular(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @Valid @RequestBody VincularItemRequestDto dto) {
        return ResponseEntity.ok(service.vincularItem(id, itemId, dto));
    }

    @Operation(summary = "Criar nova conta a pagar/receber e vincular ao item")
    @PostMapping("/{id}/itens/{itemId}/nova-conta")
    public ResponseEntity<ConciliacaoItemResponseDto> novaConta(
            @PathVariable Long id,
            @PathVariable Long itemId,
            @Valid @RequestBody CriarContaParaConciliacaoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.criarContaEVincular(id, itemId, dto));
    }

    @Operation(summary = "Marcar item como ignorado")
    @PutMapping("/{id}/itens/{itemId}/ignorar")
    public ResponseEntity<ConciliacaoItemResponseDto> ignorar(
            @PathVariable Long id,
            @PathVariable Long itemId) {
        return ResponseEntity.ok(service.ignorarItem(id, itemId));
    }

    @Operation(summary = "Desvincular item (voltar a NAO_IDENTIFICADO)")
    @PutMapping("/{id}/itens/{itemId}/desvincular")
    public ResponseEntity<ConciliacaoItemResponseDto> desvincular(
            @PathVariable Long id,
            @PathVariable Long itemId) {
        return ResponseEntity.ok(service.desvincularItem(id, itemId));
    }

    @Operation(summary = "Finalizar conciliação — dispara todas as baixas em lote")
    @PostMapping("/{id}/finalizar")
    public ResponseEntity<ConciliacaoResponseDto> finalizar(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) FinalizarConciliacaoRequestDto dto) {
        return ResponseEntity.ok(service.finalizar(id, dto));
    }

    @Operation(summary = "Cancelar sessão de conciliação pendente")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancelar(@PathVariable Long id) {
        service.cancelar(id);
        return ResponseEntity.noContent().build();
    }
}
