package br.com.core4erp.categoria.controller;

import br.com.core4erp.categoria.dto.CategoriaRequestDto;
import br.com.core4erp.categoria.dto.CategoriaResponseDto;
import br.com.core4erp.categoria.service.CategoriaService;
import br.com.core4erp.config.rbac.Requer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Categorias", description = "Categorias de receita e despesa")
@RestController
@RequestMapping("/api/categorias")
public class CategoriaController {

    private final CategoriaService categoriaService;

    public CategoriaController(CategoriaService categoriaService) {
        this.categoriaService = categoriaService;
    }

    @Operation(summary = "Listar categorias do usuário (paginado)")
    @GetMapping
    @Requer("CATEGORIA_VISUALIZAR")
    public ResponseEntity<Page<CategoriaResponseDto>> listar(
            @PageableDefault(size = 200, sort = "descricao") Pageable pageable) {
        return ResponseEntity.ok(categoriaService.listar(pageable));
    }

    @Operation(summary = "Buscar categoria por ID")
    @GetMapping("/{id}")
    @Requer("CATEGORIA_VISUALIZAR")
    public ResponseEntity<CategoriaResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(categoriaService.buscarPorId(id));
    }

    @Operation(summary = "Criar nova categoria")
    @PostMapping
    @Requer("CATEGORIA_CRIAR")
    public ResponseEntity<CategoriaResponseDto> criar(@Valid @RequestBody CategoriaRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categoriaService.criar(dto));
    }

    @Operation(summary = "Atualizar categoria")
    @PutMapping("/{id}")
    @Requer("CATEGORIA_EDITAR")
    public ResponseEntity<CategoriaResponseDto> atualizar(@PathVariable Long id,
                                                           @Valid @RequestBody CategoriaRequestDto dto) {
        return ResponseEntity.ok(categoriaService.atualizar(id, dto));
    }

    @Operation(summary = "Remover categoria")
    @DeleteMapping("/{id}")
    @Requer("CATEGORIA_DELETAR")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        categoriaService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
