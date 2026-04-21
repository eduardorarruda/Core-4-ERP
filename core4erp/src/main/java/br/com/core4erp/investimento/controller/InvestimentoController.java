package br.com.core4erp.investimento.controller;

import br.com.core4erp.investimento.dto.*;
import br.com.core4erp.investimento.service.InvestimentoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Investimentos", description = "Carteiras de investimento e registro de transações")
@RestController
@RequestMapping("/api/investimentos")
public class InvestimentoController {

    private final InvestimentoService service;

    public InvestimentoController(InvestimentoService service) {
        this.service = service;
    }

    @Operation(summary = "Listar carteiras de investimento do usuário")
    @GetMapping
    public ResponseEntity<List<ContaInvestimentoResponseDto>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @Operation(summary = "Buscar carteira por ID")
    @GetMapping("/{id}")
    public ResponseEntity<ContaInvestimentoResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @Operation(summary = "Criar nova carteira de investimento")
    @PostMapping
    public ResponseEntity<ContaInvestimentoResponseDto> criar(@Valid @RequestBody ContaInvestimentoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(dto));
    }

    @Operation(summary = "Atualizar carteira de investimento")
    @PutMapping("/{id}")
    public ResponseEntity<ContaInvestimentoResponseDto> atualizar(@PathVariable Long id,
                                                                    @Valid @RequestBody ContaInvestimentoRequestDto dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @Operation(summary = "Remover carteira de investimento")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Listar transações de uma carteira")
    @GetMapping("/{id}/transacoes")
    public ResponseEntity<List<TransacaoInvestimentoResponseDto>> listarTransacoes(@PathVariable Long id) {
        return ResponseEntity.ok(service.listarTransacoes(id));
    }

    @Operation(summary = "Registrar aporte ou resgate na carteira")
    @PostMapping("/{id}/transacoes")
    public ResponseEntity<TransacaoInvestimentoResponseDto> registrarTransacao(
            @PathVariable Long id,
            @Valid @RequestBody TransacaoInvestimentoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.registrarTransacao(id, dto));
    }
}
