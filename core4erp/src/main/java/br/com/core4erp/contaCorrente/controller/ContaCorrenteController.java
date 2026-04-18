package br.com.core4erp.contaCorrente.controller;

import br.com.core4erp.contaCorrente.dto.ContaCorrenteRequestDto;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteResponseDto;
import br.com.core4erp.contaCorrente.dto.TransferenciaRequestDto;
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
    public ResponseEntity<List<ContaCorrenteResponseDto>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @Operation(summary = "Buscar conta corrente por ID")
    @GetMapping("/{id}")
    public ResponseEntity<ContaCorrenteResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @Operation(summary = "Cadastrar nova conta corrente")
    @PostMapping
    public ResponseEntity<ContaCorrenteResponseDto> criar(@Valid @RequestBody ContaCorrenteRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(dto));
    }

    @Operation(summary = "Atualizar conta corrente")
    @PutMapping("/{id}")
    public ResponseEntity<ContaCorrenteResponseDto> atualizar(@PathVariable Long id,
                                                               @Valid @RequestBody ContaCorrenteRequestDto dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @Operation(summary = "Remover conta corrente")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Transferir saldo entre contas correntes do usuário")
    @PostMapping("/transferir")
    public ResponseEntity<Void> transferir(@Valid @RequestBody TransferenciaRequestDto dto) {
        service.transferir(dto);
        return ResponseEntity.noContent().build();
    }
}
