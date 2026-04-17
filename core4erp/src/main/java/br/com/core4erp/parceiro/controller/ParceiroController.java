package br.com.core4erp.parceiro.controller;

import br.com.core4erp.parceiro.dto.ParceiroRequestDto;
import br.com.core4erp.parceiro.dto.ParceiroResponseDto;
import br.com.core4erp.parceiro.service.ParceiroService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/parceiros")
public class ParceiroController {

    private final ParceiroService parceiroService;

    public ParceiroController(ParceiroService parceiroService) {
        this.parceiroService = parceiroService;
    }

    @GetMapping
    public ResponseEntity<List<ParceiroResponseDto>> listar() {
        return ResponseEntity.ok(parceiroService.listar());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ParceiroResponseDto> buscar(@PathVariable Long id) {
        return ResponseEntity.ok(parceiroService.buscarPorId(id));
    }

    @PostMapping
    public ResponseEntity<ParceiroResponseDto> criar(@Valid @RequestBody ParceiroRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(parceiroService.criar(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ParceiroResponseDto> atualizar(@PathVariable Long id,
                                                          @Valid @RequestBody ParceiroRequestDto dto) {
        return ResponseEntity.ok(parceiroService.atualizar(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        parceiroService.deletar(id);
        return ResponseEntity.noContent().build();
    }
}
