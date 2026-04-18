package br.com.core4erp.cartaoCredito.controller;

import br.com.core4erp.cartaoCredito.dto.*;
import br.com.core4erp.cartaoCredito.service.CartaoCreditoService;
import br.com.core4erp.conta.dto.ContaResponseDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Cartões de Crédito", description = "Cartões, lançamentos e fechamento de fatura")
@RestController
@RequestMapping("/api/cartoes")
public class CartaoCreditoController {

    private final CartaoCreditoService service;

    public CartaoCreditoController(CartaoCreditoService service) {
        this.service = service;
    }

    // ── Cartões ───────────────────────────────────────────────────────────────

    @Operation(summary = "Listar cartões do usuário com limite usado")
    @GetMapping
    public ResponseEntity<Page<CartaoCreditoResponseDto>> listar(
            @PageableDefault(size = 200, sort = "nome") Pageable pageable) {
        return ResponseEntity.ok(service.listar(pageable));
    }

    @Operation(summary = "Buscar cartão por ID")
    @GetMapping("/{id}")
    public ResponseEntity<CartaoCreditoResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @Operation(summary = "Cadastrar novo cartão")
    @PostMapping
    public ResponseEntity<CartaoCreditoResponseDto> criar(@Valid @RequestBody CartaoCreditoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(dto));
    }

    @Operation(summary = "Atualizar cartão")
    @PutMapping("/{id}")
    public ResponseEntity<CartaoCreditoResponseDto> atualizar(@PathVariable Long id,
                                                               @Valid @RequestBody CartaoCreditoRequestDto dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @Operation(summary = "Remover cartão")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }

    // ── Lançamentos ───────────────────────────────────────────────────────────

    @Operation(summary = "Listar lançamentos do cartão (filtro opcional por mês/ano)")
    @GetMapping("/{id}/lancamentos")
    public ResponseEntity<List<LancamentoResponseDto>> listarLancamentos(
            @PathVariable Long id,
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer ano) {
        return ResponseEntity.ok(service.listarLancamentos(id, mes, ano));
    }

    @Operation(summary = "Registrar lançamento (cria parcelas se parcelado)")
    @PostMapping("/{id}/lancamentos")
    public ResponseEntity<List<LancamentoResponseDto>> criarLancamento(
            @PathVariable Long id,
            @Valid @RequestBody LancamentoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criarLancamento(id, dto));
    }

    @Operation(summary = "Atualizar lançamento")
    @PutMapping("/{id}/lancamentos/{lancamentoId}")
    public ResponseEntity<LancamentoResponseDto> atualizarLancamento(
            @PathVariable Long id,
            @PathVariable Long lancamentoId,
            @Valid @RequestBody LancamentoRequestDto dto) {
        return ResponseEntity.ok(service.atualizarLancamento(id, lancamentoId, dto));
    }

    @Operation(summary = "Remover lançamento")
    @DeleteMapping("/{id}/lancamentos/{lancamentoId}")
    public ResponseEntity<Void> deletarLancamento(@PathVariable Long id, @PathVariable Long lancamentoId) {
        service.deletarLancamento(id, lancamentoId);
        return ResponseEntity.noContent().build();
    }

    // ── Fechamento de fatura ──────────────────────────────────────────────────

    @Operation(summary = "Fechar fatura e gerar conta a pagar")
    @PostMapping("/{id}/fechar-fatura")
    public ResponseEntity<ContaResponseDto> fecharFatura(
            @PathVariable Long id,
            @Valid @RequestBody FechamentoFaturaRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.fecharFatura(id, dto));
    }
}
