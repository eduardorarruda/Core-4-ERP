package br.com.core4erp.plano.controller;

import br.com.core4erp.plano.dto.PlanoRequestDto;
import br.com.core4erp.plano.dto.PlanoResponseDto;
import br.com.core4erp.plano.service.PlanoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.List;

@Tag(name = "Planos", description = "Gestão de planos de assinatura")
@RestController
@RequestMapping("/api/planos")
@RequiredArgsConstructor
public class PlanoController {

    private final PlanoService planoService;

    @Operation(summary = "Listar planos ativos — público")
    @GetMapping("/ativos")
    public ResponseEntity<List<PlanoResponseDto>> listarAtivos() {
        return ResponseEntity.ok(planoService.listarAtivos());
    }

    @Operation(summary = "Listar todos os planos — Admin Sistema")
    @GetMapping
    public ResponseEntity<List<PlanoResponseDto>> listarTodos() {
        return ResponseEntity.ok(planoService.listarTodos());
    }

    @Operation(summary = "Criar plano — Admin Sistema")
    @PostMapping
    public ResponseEntity<PlanoResponseDto> criar(@Valid @RequestBody PlanoRequestDto dto) {
        PlanoResponseDto criado = planoService.criar(dto);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
            .path("/{id}").buildAndExpand(criado.id()).toUri();
        return ResponseEntity.created(location).body(criado);
    }

    @Operation(summary = "Editar plano — Admin Sistema")
    @PutMapping("/{id}")
    public ResponseEntity<PlanoResponseDto> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody PlanoRequestDto dto) {
        return ResponseEntity.ok(planoService.atualizar(id, dto));
    }

    @Operation(summary = "Desativar plano — Admin Sistema")
    @PatchMapping("/{id}/desativar")
    public ResponseEntity<Void> desativar(@PathVariable Long id) {
        planoService.desativar(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Reativar plano — Admin Sistema")
    @PatchMapping("/{id}/reativar")
    public ResponseEntity<Void> reativar(@PathVariable Long id) {
        planoService.reativar(id);
        return ResponseEntity.noContent().build();
    }
}
