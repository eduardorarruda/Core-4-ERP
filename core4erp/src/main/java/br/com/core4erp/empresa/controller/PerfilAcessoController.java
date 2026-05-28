package br.com.core4erp.empresa.controller;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.empresa.dto.PerfilAcessoRequestDto;
import br.com.core4erp.empresa.dto.PerfilAcessoResponseDto;
import br.com.core4erp.empresa.dto.PermissaoResponseDto;
import br.com.core4erp.empresa.service.PerfilAcessoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/empresa")
@RequiredArgsConstructor
public class PerfilAcessoController {

    private final PerfilAcessoService perfilAcessoService;

    @GetMapping("/perfis")
    @Requer("USUARIO_VISUALIZAR")
    public ResponseEntity<List<PerfilAcessoResponseDto>> listar() {
        return ResponseEntity.ok(perfilAcessoService.listar());
    }

    @GetMapping("/permissoes")
    @Requer("CONFIGURACAO_EDITAR")
    public ResponseEntity<List<PermissaoResponseDto>> listarPermissoes() {
        return ResponseEntity.ok(perfilAcessoService.listarPermissoes());
    }

    @PostMapping("/perfis")
    @Requer("CONFIGURACAO_EDITAR")
    public ResponseEntity<PerfilAcessoResponseDto> criar(@Valid @RequestBody PerfilAcessoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(perfilAcessoService.criar(dto));
    }

    @PutMapping("/perfis/{id}")
    @Requer("CONFIGURACAO_EDITAR")
    public ResponseEntity<PerfilAcessoResponseDto> atualizar(
            @PathVariable Long id,
            @Valid @RequestBody PerfilAcessoRequestDto dto) {
        return ResponseEntity.ok(perfilAcessoService.atualizar(id, dto));
    }

    @DeleteMapping("/perfis/{id}")
    @Requer("CONFIGURACAO_EDITAR")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        perfilAcessoService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
