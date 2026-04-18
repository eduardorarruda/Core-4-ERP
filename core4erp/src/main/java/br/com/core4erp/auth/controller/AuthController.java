package br.com.core4erp.auth.controller;

import br.com.core4erp.auth.dto.AtualizarPerfilRequestDto;
import br.com.core4erp.auth.dto.LoginRequestDto;
import br.com.core4erp.auth.dto.LoginResponseDto;
import br.com.core4erp.auth.dto.MeResponseDto;
import br.com.core4erp.auth.dto.RegistrarRequestDto;
import br.com.core4erp.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Autenticação", description = "Registro, login e perfil do usuário")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @Operation(summary = "Registrar novo usuário")
    @PostMapping("/registrar")
    public ResponseEntity<MeResponseDto> registrar(@Valid @RequestBody RegistrarRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registrar(request));
    }

    @Operation(summary = "Autenticar e obter JWT")
    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(@Valid @RequestBody LoginRequestDto request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @Operation(summary = "Retorna dados do usuário autenticado")
    @GetMapping("/me")
    public ResponseEntity<MeResponseDto> me(Authentication authentication) {
        return ResponseEntity.ok(authService.me(authentication.getName()));
    }

    @Operation(summary = "Atualizar nome, foto e senha do usuário autenticado")
    @PutMapping("/perfil")
    public ResponseEntity<MeResponseDto> atualizarPerfil(
            @Valid @RequestBody AtualizarPerfilRequestDto dto,
            Authentication authentication) {
        return ResponseEntity.ok(authService.atualizarPerfil(authentication.getName(), dto));
    }
}
