package br.com.core4erp.orcamento.controller;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.orcamento.dto.OrcamentoItemResponseDto;
import br.com.core4erp.orcamento.dto.OrcamentoMesResponseDto;
import br.com.core4erp.orcamento.dto.OrcamentoRequestDto;
import br.com.core4erp.orcamento.dto.SugestaoOrcamentoResponseDto;
import br.com.core4erp.orcamento.service.OrcamentoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.List;

@Tag(name = "Orçamento", description = "Limite mensal de gasto por categoria")
@RestController
@RequestMapping("/api/orcamentos")
public class OrcamentoController {

    private final OrcamentoService orcamentoService;

    public OrcamentoController(OrcamentoService orcamentoService) {
        this.orcamentoService = orcamentoService;
    }

    @Operation(summary = "Orçamento do mês: limite, gasto, ritmo e status por categoria")
    @GetMapping
    @Requer("ORCAMENTO_VISUALIZAR")
    public ResponseEntity<OrcamentoMesResponseDto> listar(
            @Parameter(description = "Mês no formato AAAA-MM (padrão: mês atual)")
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth mes) {
        return ResponseEntity.ok(orcamentoService.listar(mes));
    }

    @Operation(summary = "Categorias com gasto e sem orçamento, com limite sugerido (média de 3 meses)")
    @GetMapping("/sugestoes")
    @Requer("ORCAMENTO_VISUALIZAR")
    public ResponseEntity<List<SugestaoOrcamentoResponseDto>> sugestoes(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth mes) {
        return ResponseEntity.ok(orcamentoService.sugestoes(mes));
    }

    @Operation(summary = "Criar orçamento para uma categoria principal")
    @PostMapping
    @Requer("ORCAMENTO_EDITAR")
    public ResponseEntity<OrcamentoItemResponseDto> criar(@Valid @RequestBody OrcamentoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(orcamentoService.criar(dto));
    }

    @Operation(summary = "Alterar limite (ou categoria) de um orçamento")
    @PutMapping("/{id}")
    @Requer("ORCAMENTO_EDITAR")
    public ResponseEntity<OrcamentoItemResponseDto> atualizar(@PathVariable Long id,
                                                              @Valid @RequestBody OrcamentoRequestDto dto) {
        return ResponseEntity.ok(orcamentoService.atualizar(id, dto));
    }

    @Operation(summary = "Remover orçamento (inativa)")
    @DeleteMapping("/{id}")
    @Requer("ORCAMENTO_EDITAR")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        orcamentoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
