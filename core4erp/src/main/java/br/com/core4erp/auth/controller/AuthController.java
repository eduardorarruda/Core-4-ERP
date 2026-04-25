package br.com.core4erp.auth.controller;

import br.com.core4erp.auth.dto.AtualizarPerfilRequestDto;
import br.com.core4erp.auth.dto.LoginRequestDto;
import br.com.core4erp.auth.dto.MeResponseDto;
import br.com.core4erp.auth.dto.RegistrarRequestDto;
import br.com.core4erp.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Autenticação", description = "Registro, login e perfil do usuário")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    @Value("${jwt.expiration}")
    private long tokenExpiration;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @Operation(summary = "Registrar novo usuário")
    @PostMapping("/registrar")
    public ResponseEntity<MeResponseDto> registrar(@Valid @RequestBody RegistrarRequestDto request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.registrar(request));
    }

    @Operation(summary = "Autenticar e receber JWT via cookie HttpOnly")
    @PostMapping("/login")
    public ResponseEntity<MeResponseDto> login(@Valid @RequestBody LoginRequestDto request, HttpServletResponse response) {
        AuthService.LoginResult result = authService.login(request);
        response.addHeader(HttpHeaders.SET_COOKIE, jwtCookie(result.token(), tokenExpiration / 1000));
        return ResponseEntity.ok(result.usuario());
    }

    @Operation(summary = "Encerrar sessão e remover cookie JWT")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, jwtCookie("", 0));
        return ResponseEntity.noContent().build();
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

    private static String jwtCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from("access_token", value)
                .httpOnly(true)
                .secure(true)
                .sameSite("None")
                .path("/")
                .maxAge(maxAgeSeconds)
                .build()
                .toString();
    }
}
