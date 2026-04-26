package br.com.core4erp.conta.controller;

import br.com.core4erp.conta.dto.BaixaRequestDto;
import br.com.core4erp.conta.dto.ContaCreateDto;
import br.com.core4erp.conta.dto.ContaResponseDto;
import br.com.core4erp.conta.service.ContaService;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.TipoConta;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Tag(name = "Contas Financeiras", description = "Contas a pagar e a receber; suporta baixa e estorno")
@RestController
@RequestMapping("/api/contas")
public class ContaController {

    private final ContaService contaService;

    public ContaController(ContaService contaService) {
        this.contaService = contaService;
    }

    @Operation(summary = "Listar contas com filtros opcionais (tipo, status, datas, parceiro, valor, categoria)")
    @GetMapping
    public ResponseEntity<Page<ContaResponseDto>> listar(
            @RequestParam(required = false) TipoConta tipo,
            @RequestParam(required = false) StatusConta status,
            @RequestParam(required = false) String numeroDocumento,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate vencimentoInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate vencimentoFim,
            @RequestParam(required = false) Long parceiroId,
            @RequestParam(required = false) BigDecimal valorMin,
            @RequestParam(required = false) BigDecimal valorMax,
            @RequestParam(required = false) Long categoriaId,
            @PageableDefault(size = 20, sort = "dataVencimento") Pageable pageable) {
        return ResponseEntity.ok(contaService.listarComFiltros(
                tipo, status, numeroDocumento,
                vencimentoInicio, vencimentoFim,
                parceiroId, valorMin, valorMax,
                categoriaId, pageable));
    }

    @Operation(summary = "Buscar conta por ID")
    @GetMapping("/{id}")
    public ResponseEntity<ContaResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(contaService.buscarPorId(id));
    }

    @Operation(summary = "Criar conta (gera recorrências automaticamente se configurado)")
    @PostMapping
    public ResponseEntity<List<ContaResponseDto>> criar(@Valid @RequestBody ContaCreateDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contaService.criar(dto));
    }

    @Operation(summary = "Atualizar conta")
    @PutMapping("/{id}")
    public ResponseEntity<ContaResponseDto> atualizar(@PathVariable Long id,
                                                       @Valid @RequestBody ContaCreateDto dto) {
        return ResponseEntity.ok(contaService.atualizar(id, dto));
    }

    @Operation(summary = "Remover conta")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        contaService.deletar(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Baixar conta (registrar pagamento/recebimento)")
    @PatchMapping("/{id}/baixa")
    public ResponseEntity<ContaResponseDto> baixar(@PathVariable Long id,
                                                    @Valid @RequestBody BaixaRequestDto dto) {
        return ResponseEntity.ok(contaService.baixar(id, dto));
    }

    @Operation(summary = "Estornar baixa e devolver saldo à conta corrente")
    @DeleteMapping("/{id}/baixa")
    public ResponseEntity<ContaResponseDto> estornar(@PathVariable Long id) {
        return ResponseEntity.ok(contaService.estornar(id));
    }
}
