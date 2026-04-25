package br.com.core4erp.assinatura.controller;

import br.com.core4erp.assinatura.dto.AssinaturaRequestDto;
import br.com.core4erp.assinatura.dto.AssinaturaResponseDto;
import br.com.core4erp.assinatura.service.AssinaturaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Assinaturas", description = "Assinaturas e recorrências do usuário")
@RestController
@RequestMapping("/api/assinaturas")
public class AssinaturaController {

    private final AssinaturaService assinaturaService;

    public AssinaturaController(AssinaturaService assinaturaService) {
        this.assinaturaService = assinaturaService;
    }

    @Operation(summary = "Listar todas as assinaturas do usuário")
    @GetMapping
    public ResponseEntity<List<AssinaturaResponseDto>> listar() {
        return ResponseEntity.ok(assinaturaService.listar());
    }

    @Operation(summary = "Buscar assinatura por ID")
    @GetMapping("/{id}")
    public ResponseEntity<AssinaturaResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(assinaturaService.buscarPorId(id));
    }

    @Operation(summary = "Criar nova assinatura")
    @PostMapping
    public ResponseEntity<AssinaturaResponseDto> criar(@Valid @RequestBody AssinaturaRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(assinaturaService.criar(dto));
    }

    @Operation(summary = "Atualizar assinatura")
    @PutMapping("/{id}")
    public ResponseEntity<AssinaturaResponseDto> atualizar(@PathVariable Long id,
                                                            @Valid @RequestBody AssinaturaRequestDto dto) {
        return ResponseEntity.ok(assinaturaService.atualizar(id, dto));
    }

    @Operation(summary = "Remover assinatura")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        assinaturaService.deletar(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Listar apenas assinaturas ativas")
    @GetMapping("/ativas")
    public ResponseEntity<List<AssinaturaResponseDto>> listarAtivas() {
        return ResponseEntity.ok(assinaturaService.listarAtivas());
    }
}
