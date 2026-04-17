package br.com.core4erp.investimento.controller;

import br.com.core4erp.investimento.dto.*;
import br.com.core4erp.investimento.service.InvestimentoService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/investimentos")
public class InvestimentoController {

    private final InvestimentoService service;

    public InvestimentoController(InvestimentoService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<ContaInvestimentoResponseDto>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContaInvestimentoResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<ContaInvestimentoResponseDto> criar(@Valid @RequestBody ContaInvestimentoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ContaInvestimentoResponseDto> atualizar(@PathVariable Long id,
                                                                    @Valid @RequestBody ContaInvestimentoRequestDto dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/transacoes")
    public ResponseEntity<List<TransacaoInvestimentoResponseDto>> listarTransacoes(@PathVariable Long id) {
        return ResponseEntity.ok(service.listarTransacoes(id));
    }

    @PostMapping("/{id}/transacoes")
    public ResponseEntity<TransacaoInvestimentoResponseDto> registrarTransacao(
            @PathVariable Long id,
            @Valid @RequestBody TransacaoInvestimentoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.registrarTransacao(id, dto));
    }
}
