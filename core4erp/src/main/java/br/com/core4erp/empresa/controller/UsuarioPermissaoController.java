package br.com.core4erp.empresa.controller;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.empresa.dto.*;
import br.com.core4erp.empresa.service.UsuarioPermissaoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/empresa/usuarios/{usuarioId}/permissoes")
@RequiredArgsConstructor
public class UsuarioPermissaoController {

    private final UsuarioPermissaoService service;

    @GetMapping
    @Requer("USUARIO_VISUALIZAR")
    public ResponseEntity<PermissoesUsuarioResponseDto> listar(@PathVariable Long usuarioId) {
        return ResponseEntity.ok(service.listar(usuarioId));
    }

    @PostMapping
    @Requer("USUARIO_EDITAR")
    public ResponseEntity<PermissaoUsuarioResponseDto> concederOuRevogar(
            @PathVariable Long usuarioId,
            @Valid @RequestBody PermissaoUsuarioRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(service.concederOuRevogar(usuarioId, dto));
    }

    @PutMapping
    @Requer("USUARIO_EDITAR")
    public ResponseEntity<PermissoesUsuarioResponseDto> substituirTodas(
            @PathVariable Long usuarioId,
            @Valid @RequestBody PermissaoUsuarioBulkRequestDto dto) {
        return ResponseEntity.ok(service.substituirTodas(usuarioId, dto));
    }

    @DeleteMapping("/{permissaoId}")
    @Requer("USUARIO_EDITAR")
    public ResponseEntity<Void> remover(
            @PathVariable Long usuarioId,
            @PathVariable Long permissaoId) {
        service.removerPermissaoDireta(usuarioId, permissaoId);
        return ResponseEntity.noContent().build();
    }
}
