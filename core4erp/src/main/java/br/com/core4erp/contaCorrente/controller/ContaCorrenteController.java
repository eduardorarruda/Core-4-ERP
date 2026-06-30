package br.com.core4erp.contaCorrente.controller;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteRequestDto;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteResponseDto;
import br.com.core4erp.contaCorrente.dto.TransferenciaRequestDto;
import br.com.core4erp.contaCorrente.dto.TransferenciaResponseDto;
import br.com.core4erp.contaCorrente.service.ContaCorrenteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Contas Correntes", description = "Contas bancárias e transferências entre contas")
@RestController
@RequestMapping("/api/contas-correntes")
public class ContaCorrenteController {

    private final ContaCorrenteService service;

    public ContaCorrenteController(ContaCorrenteService service) {
        this.service = service;
    }

    @Operation(summary = "Listar contas correntes do usuário")
    @GetMapping
    @Requer("CONTA_CORRENTE_VISUALIZAR")
    public ResponseEntity<List<ContaCorrenteResponseDto>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @Operation(summary = "Buscar conta corrente por ID")
    @GetMapping("/{id}")
    @Requer("CONTA_CORRENTE_VISUALIZAR")
    public ResponseEntity<ContaCorrenteResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @Operation(summary = "Cadastrar nova conta corrente")
    @PostMapping
    @Requer("CONTA_CORRENTE_CRIAR")
    public ResponseEntity<ContaCorrenteResponseDto> criar(@Valid @RequestBody ContaCorrenteRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(dto));
    }

    @Operation(summary = "Atualizar conta corrente")
    @PutMapping("/{id}")
    @Requer("CONTA_CORRENTE_EDITAR")
    public ResponseEntity<ContaCorrenteResponseDto> atualizar(@PathVariable Long id,
                                                               @Valid @RequestBody ContaCorrenteRequestDto dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @Operation(summary = "Remover conta corrente")
    @DeleteMapping("/{id}")
    @Requer("CONTA_CORRENTE_DELETAR")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }

    // ── Transferências ────────────────────────────────────────────────────────

    @Operation(summary = "Registrar transferência entre contas")
    @PostMapping("/transferir")
    @Requer("CONTA_CORRENTE_TRANSFERIR")
    public ResponseEntity<TransferenciaResponseDto> transferir(@Valid @RequestBody TransferenciaRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.transferir(dto));
    }

    @Operation(summary = "Listar transferências do usuário")
    @GetMapping("/transferencias")
    @Requer("CONTA_CORRENTE_VISUALIZAR")
    public ResponseEntity<List<TransferenciaResponseDto>> listarTransferencias() {
        return ResponseEntity.ok(service.listarTransferencias());
    }

    @Operation(summary = "Atualizar transferência e ajustar saldos")
    @PutMapping("/transferencias/{id}")
    @Requer("CONTA_CORRENTE_TRANSFERIR")
    public ResponseEntity<TransferenciaResponseDto> atualizarTransferencia(
            @PathVariable Long id,
            @Valid @RequestBody TransferenciaRequestDto dto) {
        return ResponseEntity.ok(service.atualizarTransferencia(id, dto));
    }

    @Operation(summary = "Excluir transferência e estornar saldos")
    @DeleteMapping("/transferencias/{id}")
    @Requer("CONTA_CORRENTE_TRANSFERIR")
    public ResponseEntity<Void> deletarTransferencia(@PathVariable Long id) {
        service.deletarTransferencia(id);
        return ResponseEntity.noContent().build();
    }
}
