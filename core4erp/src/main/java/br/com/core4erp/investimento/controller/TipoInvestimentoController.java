package br.com.core4erp.investimento.controller;

import br.com.core4erp.investimento.dto.TipoInvestimentoRequestDto;
import br.com.core4erp.investimento.dto.TipoInvestimentoResponseDto;
import br.com.core4erp.investimento.service.TipoInvestimentoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Tipos de Investimento", description = "Tipos de investimento definidos pelo usuário")
@RestController
@RequestMapping("/api/investimentos/tipos")
public class TipoInvestimentoController {

    private final TipoInvestimentoService service;

    public TipoInvestimentoController(TipoInvestimentoService service) {
        this.service = service;
    }

    @Operation(summary = "Listar tipos de investimento do usuário")
    @GetMapping
    public ResponseEntity<List<TipoInvestimentoResponseDto>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @Operation(summary = "Criar novo tipo de investimento")
    @PostMapping
    public ResponseEntity<TipoInvestimentoResponseDto> criar(@Valid @RequestBody TipoInvestimentoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(dto));
    }

    @Operation(summary = "Atualizar tipo de investimento")
    @PutMapping("/{id}")
    public ResponseEntity<TipoInvestimentoResponseDto> atualizar(@PathVariable Long id,
                                                                  @Valid @RequestBody TipoInvestimentoRequestDto dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @Operation(summary = "Remover tipo de investimento")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
