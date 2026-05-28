package br.com.core4erp.auth.controller;

import br.com.core4erp.empresa.dto.AceitarConviteRequestDto;
import br.com.core4erp.empresa.dto.ConviteResponseDto;
import br.com.core4erp.empresa.service.ConviteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Convites Público", description = "Endpoints públicos de convite")
@RestController
@RequiredArgsConstructor
public class ConvitePublicoController {

    private final ConviteService conviteService;

    @Operation(summary = "Consultar dados do convite pelo token")
    @GetMapping("/api/auth/convite/{token}")
    public ResponseEntity<ConviteResponseDto> consultar(@PathVariable String token) {
        return ResponseEntity.ok(conviteService.buscarPorToken(token));
    }

    @Operation(summary = "Aceitar convite e criar conta")
    @PostMapping("/api/auth/aceitar-convite")
    public ResponseEntity<Void> aceitar(@Valid @RequestBody AceitarConviteRequestDto dto) {
        conviteService.aceitar(dto);
        return ResponseEntity.ok().build();
    }
}
