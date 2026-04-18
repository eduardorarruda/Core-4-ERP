package br.com.core4erp.parceiro.controller;

import br.com.core4erp.parceiro.dto.ParceiroRequestDto;
import br.com.core4erp.parceiro.dto.ParceiroResponseDto;
import br.com.core4erp.parceiro.service.BrasilApiService;
import br.com.core4erp.parceiro.service.ParceiroService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Parceiros", description = "Fornecedores e clientes; busca de CNPJ via BrasilAPI")
@RestController
@RequestMapping("/api/parceiros")
public class ParceiroController {

    private final ParceiroService parceiroService;
    private final BrasilApiService brasilApiService;

    public ParceiroController(ParceiroService parceiroService, BrasilApiService brasilApiService) {
        this.parceiroService = parceiroService;
        this.brasilApiService = brasilApiService;
    }

    @Operation(summary = "Consultar dados de CNPJ via BrasilAPI")
    @GetMapping("/cnpj/{cnpj}")
    public ResponseEntity<BrasilApiService.CnpjData> buscarCnpj(@PathVariable String cnpj) {
        return brasilApiService.buscarCnpj(cnpj)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @Operation(summary = "Listar parceiros do usuário (paginado)")
    @GetMapping
    public ResponseEntity<Page<ParceiroResponseDto>> listar(
            @PageableDefault(size = 200, sort = "razaoSocial") Pageable pageable) {
        return ResponseEntity.ok(parceiroService.listar(pageable));
    }

    @Operation(summary = "Buscar parceiro por ID")
    @GetMapping("/{id}")
    public ResponseEntity<ParceiroResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(parceiroService.buscarPorId(id));
    }

    @Operation(summary = "Cadastrar novo parceiro")
    @PostMapping
    public ResponseEntity<ParceiroResponseDto> criar(@Valid @RequestBody ParceiroRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(parceiroService.criar(dto));
    }

    @Operation(summary = "Atualizar parceiro")
    @PutMapping("/{id}")
    public ResponseEntity<ParceiroResponseDto> atualizar(@PathVariable Long id,
                                                          @Valid @RequestBody ParceiroRequestDto dto) {
        return ResponseEntity.ok(parceiroService.atualizar(id, dto));
    }

    @Operation(summary = "Remover parceiro")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        parceiroService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
