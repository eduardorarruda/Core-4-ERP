package br.com.core4erp.empresa.controller;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.empresa.dto.*;
import br.com.core4erp.empresa.service.EmpresaService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class EmpresaController {

    private final EmpresaService empresaService;
    private final SecurityContextUtils securityCtx;

    @GetMapping("/api/empresas/minhas")
    public ResponseEntity<List<EmpresaResumoDto>> minhas() {
        return ResponseEntity.ok(empresaService.minhas(securityCtx.getEmail()));
    }

    @PostMapping("/api/empresas")
    public ResponseEntity<EmpresaResponseDto> criar(@Valid @RequestBody EmpresaRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(empresaService.criar(dto, securityCtx.getUsuarioId()));
    }

    @GetMapping("/api/empresas/{id}")
    public ResponseEntity<EmpresaResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(empresaService.buscar(id));
    }

    @PutMapping("/api/empresas/{id}")
    @Requer("CONFIGURACAO_EDITAR")
    public ResponseEntity<EmpresaResponseDto> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody EmpresaRequestDto dto) {
        return ResponseEntity.ok(empresaService.atualizar(id, dto));
    }

    // Gestão de membros da empresa atual

    @GetMapping("/api/empresa/usuarios")
    @Requer("USUARIO_VISUALIZAR")
    public ResponseEntity<Page<MembroResponseDto>> listarMembros(Pageable pageable) {
        return ResponseEntity.ok(empresaService.listarMembros(pageable));
    }

    @PostMapping("/api/empresa/usuarios/convidar")
    @Requer("USUARIO_CONVIDAR")
    public ResponseEntity<MembroResponseDto> convidar(@Valid @RequestBody ConvidarMembroRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(empresaService.convidarMembro(dto));
    }

    @PutMapping("/api/empresa/usuarios/{usuarioId}/perfil")
    @Requer("USUARIO_EDITAR")
    public ResponseEntity<MembroResponseDto> alterarPerfil(
            @PathVariable Long usuarioId,
            @Valid @RequestBody AlterarPerfilRequestDto dto) {
        return ResponseEntity.ok(empresaService.alterarPerfil(usuarioId, dto));
    }

    @DeleteMapping("/api/empresa/usuarios/{usuarioId}")
    @Requer("USUARIO_REMOVER")
    public ResponseEntity<Void> removerMembro(@PathVariable Long usuarioId) {
        empresaService.removerMembro(usuarioId);
        return ResponseEntity.noContent().build();
    }
}
