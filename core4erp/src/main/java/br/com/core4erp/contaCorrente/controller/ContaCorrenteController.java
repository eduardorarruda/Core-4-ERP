package br.com.core4erp.contaCorrente.controller;

import br.com.core4erp.contaCorrente.dto.ContaCorrenteRequestDto;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteResponseDto;
import br.com.core4erp.contaCorrente.dto.TransferenciaRequestDto;
import br.com.core4erp.contaCorrente.service.ContaCorrenteService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contas-correntes")
public class ContaCorrenteController {

    private final ContaCorrenteService service;

    public ContaCorrenteController(ContaCorrenteService service) {
        this.service = service;
    }

    @GetMapping
    public ResponseEntity<List<ContaCorrenteResponseDto>> listar() {
        return ResponseEntity.ok(service.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContaCorrenteResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(service.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<ContaCorrenteResponseDto> criar(@Valid @RequestBody ContaCorrenteRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ContaCorrenteResponseDto> atualizar(@PathVariable Long id,
                                                               @Valid @RequestBody ContaCorrenteRequestDto dto) {
        return ResponseEntity.ok(service.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        service.deletar(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/transferir")
    public ResponseEntity<Void> transferir(@Valid @RequestBody TransferenciaRequestDto dto) {
        service.transferir(dto);
        return ResponseEntity.noContent().build();
    }
}
