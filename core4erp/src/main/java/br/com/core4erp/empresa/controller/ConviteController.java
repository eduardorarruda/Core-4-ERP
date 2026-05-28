package br.com.core4erp.empresa.controller;

import br.com.core4erp.empresa.dto.ConvidarOperadorRequestDto;
import br.com.core4erp.empresa.dto.ConviteResponseDto;
import br.com.core4erp.empresa.service.ConviteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Convites", description = "Convite e aceitação de operadores")
@RestController
@RequiredArgsConstructor
public class ConviteController {

    private final ConviteService conviteService;

    @Operation(summary = "Convidar operador para a empresa")
    @PostMapping("/api/empresa/usuarios/convidar")
    public ResponseEntity<ConviteResponseDto> convidar(
            @Valid @RequestBody ConvidarOperadorRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(conviteService.convidar(dto));
    }

    @Operation(summary = "Reenviar e-mail de convite pendente")
    @PostMapping("/api/empresa/convites/{id}/reenviar")
    public ResponseEntity<ConviteResponseDto> reenviar(@PathVariable Long id) {
        return ResponseEntity.ok(conviteService.reenviar(id));
    }

    @Operation(summary = "Listar convites pendentes da empresa")
    @GetMapping("/api/empresa/convites/pendentes")
    public ResponseEntity<Page<ConviteResponseDto>> listarPendentes(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(conviteService.listarPendentes(pageable));
    }
}
