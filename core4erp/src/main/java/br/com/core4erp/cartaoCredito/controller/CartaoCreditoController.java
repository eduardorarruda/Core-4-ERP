package br.com.core4erp.cartaoCredito.controller;

import br.com.core4erp.cartaoCredito.dto.*;
import br.com.core4erp.cartaoCredito.service.CartaoCreditoService;
import br.com.core4erp.conta.dto.ContaResponseDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cartoes")
public class CartaoCreditoController {

    private final CartaoCreditoService service;

    public CartaoCreditoController(CartaoCreditoService service) {
        this.service = service;
    }

    // ── Cartões ───────────────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<CartaoCreditoResponseDto>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CartaoCreditoResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<CartaoCreditoResponseDto> criar(@Valid @RequestBody CartaoCreditoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CartaoCreditoResponseDto> atualizar(@PathVariable Long id,
                                                               @Valid @RequestBody CartaoCreditoRequestDto dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }

    // ── Lançamentos ───────────────────────────────────────────────────────────

    @GetMapping("/{id}/lancamentos")
    public ResponseEntity<List<LancamentoResponseDto>> listarLancamentos(
            @PathVariable Long id,
            @RequestParam(required = false) Integer mes,
            @RequestParam(required = false) Integer ano) {
        return ResponseEntity.ok(service.listarLancamentos(id, mes, ano));
    }

    @PostMapping("/{id}/lancamentos")
    public ResponseEntity<List<LancamentoResponseDto>> criarLancamento(
            @PathVariable Long id,
            @Valid @RequestBody LancamentoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criarLancamento(id, dto));
    }

    @PutMapping("/{id}/lancamentos/{lancamentoId}")
    public ResponseEntity<LancamentoResponseDto> atualizarLancamento(
            @PathVariable Long id,
            @PathVariable Long lancamentoId,
            @Valid @RequestBody LancamentoRequestDto dto) {
        return ResponseEntity.ok(service.atualizarLancamento(id, lancamentoId, dto));
    }

    @DeleteMapping("/{id}/lancamentos/{lancamentoId}")
    public ResponseEntity<Void> deletarLancamento(@PathVariable Long id, @PathVariable Long lancamentoId) {
        service.deletarLancamento(id, lancamentoId);
        return ResponseEntity.noContent().build();
    }

    // ── Fechamento de fatura ──────────────────────────────────────────────────

    @PostMapping("/{id}/fechar-fatura")
    public ResponseEntity<ContaResponseDto> fecharFatura(
            @PathVariable Long id,
            @Valid @RequestBody FechamentoFaturaRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.fecharFatura(id, dto));
    }
}
