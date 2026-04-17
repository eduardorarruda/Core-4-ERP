package br.com.core4erp.conta.controller;

import br.com.core4erp.conta.dto.BaixaRequestDto;
import br.com.core4erp.conta.dto.ContaCreateDto;
import br.com.core4erp.conta.dto.ContaResponseDto;
import br.com.core4erp.conta.service.ContaService;
import br.com.core4erp.enums.TipoConta;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contas")
public class ContaController {

    private final ContaService contaService;

    public ContaController(ContaService contaService) {
        this.contaService = contaService;
    }

    @GetMapping
    public ResponseEntity<Page<ContaResponseDto>> listar(
            @RequestParam(required = false) TipoConta tipo,
            @PageableDefault(size = 20, sort = "dataVencimento") Pageable pageable) {
        if (tipo != null) {
            return ResponseEntity.ok(contaService.listarPorTipo(tipo, pageable));
        }
        return ResponseEntity.ok(contaService.listar(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContaResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(contaService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<List<ContaResponseDto>> criar(@Valid @RequestBody ContaCreateDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contaService.criar(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ContaResponseDto> atualizar(@PathVariable Long id,
                                                       @Valid @RequestBody ContaCreateDto dto) {
        return ResponseEntity.ok(contaService.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        contaService.deletar(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/baixa")
    public ResponseEntity<ContaResponseDto> baixar(@PathVariable Long id,
                                                    @Valid @RequestBody BaixaRequestDto dto) {
        return ResponseEntity.ok(contaService.baixar(id, dto));
    }
}
