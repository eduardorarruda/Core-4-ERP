package br.com.core4erp.empresa.controller;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.empresa.dto.AlterarPerfilRequestDto;
import br.com.core4erp.empresa.dto.OperadorResponseDto;
import br.com.core4erp.empresa.service.OperadorService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Operadores", description = "Gestão de membros da empresa")
@RestController
@RequestMapping("/api/empresa/operadores")
@RequiredArgsConstructor
public class OperadorController {

    private final OperadorService operadorService;

    @Operation(summary = "Listar operadores da empresa")
    @GetMapping
    @Requer("USUARIO_VISUALIZAR")
    public ResponseEntity<Page<OperadorResponseDto>> listar(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(operadorService.listar(pageable));
    }

    @Operation(summary = "Alterar perfil de um operador")
    @PatchMapping("/{usuarioId}/perfil")
    @Requer("USUARIO_EDITAR")
    public ResponseEntity<OperadorResponseDto> alterarPerfil(
            @PathVariable Long usuarioId,
            @RequestBody AlterarPerfilRequestDto dto) {
        return ResponseEntity.ok(operadorService.alterarPerfil(usuarioId, dto.perfilId()));
    }

    @Operation(summary = "Remover operador da empresa (soft delete)")
    @PatchMapping("/{usuarioId}/remover")
    @Requer("USUARIO_REMOVER")
    public ResponseEntity<Void> remover(@PathVariable Long usuarioId) {
        operadorService.remover(usuarioId);
        return ResponseEntity.noContent().build();
    }
}
