package br.com.core4erp.auth.controller;

import br.com.core4erp.auth.dto.AtualizarPerfilRequestDto;
import br.com.core4erp.auth.dto.DadosPessoaisResponseDto;
import br.com.core4erp.auth.dto.EsqueciSenhaRequestDto;
import br.com.core4erp.auth.dto.EsqueciSenhaResponseDto;
import br.com.core4erp.auth.dto.ExcluirContaRequestDto;
import br.com.core4erp.auth.dto.LoginRequestDto;
import br.com.core4erp.auth.dto.LoginResponseDto;
import br.com.core4erp.auth.dto.MeResponseDto;
import br.com.core4erp.auth.dto.PermissoesAtuaisResponseDto;
import br.com.core4erp.auth.dto.RedefinirSenhaRequestDto;
import br.com.core4erp.auth.dto.RegistrarRequestDto;
import br.com.core4erp.auth.dto.TrocarSenhaRequestDto;
import br.com.core4erp.auth.service.AuthService;
import br.com.core4erp.auth.service.ContaUsuarioService;
import br.com.core4erp.auth.service.ImagemPerfilValidator;
import br.com.core4erp.auth.service.PasswordResetService;
import br.com.core4erp.auth.service.ProfileService;
import br.com.core4erp.config.security.ClientIpResolver;
import br.com.core4erp.config.security.JwtFilter;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.dto.EmpresaResumoDto;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Tag(name = "Autenticação", description = "Registro, login e perfil do usuário")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final PasswordResetService passwordResetService;
    private final ProfileService profileService;
    private final ContaUsuarioService contaUsuarioService;
    private final TenantContext tenantCtx;
    private final ClientIpResolver clientIpResolver;

    @Value("${jwt.expiration}")
    private long tokenExpiration;

    /**
     * SameSite do cookie de sessão. Padrão {@code Lax} (defesa contra CSRF). Use {@code None}
     * (property {@code security.cookie.same-site}) somente se front e API estiverem em SITES
     * diferentes (não apenas subdomínios) — nesse caso o OrigemRequisicaoFilter é a defesa.
     */
    @Value("${security.cookie.same-site:Lax}")
    private String cookieSameSite;

    public AuthController(AuthService authService,
                          PasswordResetService passwordResetService,
                          ProfileService profileService,
                          ContaUsuarioService contaUsuarioService,
                          TenantContext tenantCtx,
                          ClientIpResolver clientIpResolver) {
        this.authService = authService;
        this.passwordResetService = passwordResetService;
        this.profileService = profileService;
        this.contaUsuarioService = contaUsuarioService;
        this.tenantCtx = tenantCtx;
        this.clientIpResolver = clientIpResolver;
    }

    @Operation(summary = "Registrar novo usuário (exige aceite dos Termos de Uso e da Política de Privacidade)")
    @PostMapping("/registrar")
    public ResponseEntity<MeResponseDto> registrar(@Valid @RequestBody RegistrarRequestDto request,
                                                   HttpServletRequest httpRequest) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(authService.registrar(request, clientIpResolver.resolver(httpRequest)));
    }

    @Operation(summary = "Autenticar e receber JWT via cookie HttpOnly")
    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(@Valid @RequestBody LoginRequestDto request,
                                                  HttpServletRequest httpRequest,
                                                  HttpServletResponse response) {
        AuthService.LoginResult result = authService.login(request, clientIpResolver.resolver(httpRequest));
        response.addHeader(HttpHeaders.SET_COOKIE, jwtCookie(result.token(), tokenExpiration / 1000));
        Long empresaAtualId = result.empresas().isEmpty() ? null : result.empresas().get(0).id();
        return ResponseEntity.ok(new LoginResponseDto(
            result.usuario(), result.empresas(), empresaAtualId, result.senhaProvisoria(), result.adminSistema()));
    }

    @Operation(summary = "Trocar empresa ativa sem novo login")
    @PostMapping("/trocar-empresa")
    public ResponseEntity<EmpresaResumoDto> trocarEmpresa(
            @RequestParam Long empresaId,
            Authentication authentication) {
        return ResponseEntity.ok(authService.trocarEmpresa(authentication.getName(), empresaId));
    }

    @Operation(summary = "Encerrar sessão neste dispositivo e remover cookie JWT")
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, jwtCookie("", 0));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Encerrar sessão em TODOS os dispositivos (revoga todos os tokens emitidos)")
    @PostMapping("/logout-todos")
    public ResponseEntity<Void> logoutTodos(Authentication authentication, HttpServletResponse response) {
        authService.logoutTodos(authentication.getName());
        response.addHeader(HttpHeaders.SET_COOKIE, jwtCookie("", 0));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Retorna dados do usuário autenticado")
    @GetMapping("/me")
    public ResponseEntity<MeResponseDto> me(Authentication authentication) {
        return ResponseEntity.ok(authService.me(authentication.getName()));
    }

    @Operation(summary = "LGPD — exporta os dados pessoais do usuário autenticado (JSON)")
    @GetMapping("/me/dados")
    public ResponseEntity<DadosPessoaisResponseDto> exportarDados(Authentication authentication) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"core4-meus-dados.json\"")
                .contentType(MediaType.APPLICATION_JSON)
                .body(contaUsuarioService.exportarDados(authentication.getName()));
    }

    @Operation(summary = "LGPD — exclui (anonimiza) a conta do usuário autenticado; exige a senha")
    @DeleteMapping("/me")
    public ResponseEntity<Void> excluirConta(@Valid @RequestBody ExcluirContaRequestDto dto,
                                             Authentication authentication,
                                             HttpServletResponse response) {
        contaUsuarioService.excluirConta(authentication.getName(), dto.senha());
        response.addHeader(HttpHeaders.SET_COOKIE, jwtCookie("", 0));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Retorna as permissões efetivas do usuário na empresa atual")
    @GetMapping("/me/permissoes")
    public ResponseEntity<PermissoesAtuaisResponseDto> minhasPermissoes() {
        return ResponseEntity.ok(new PermissoesAtuaisResponseDto(
                tenantCtx.getPermissoes(),
                tenantCtx.getPerfilNome()
        ));
    }

    @Operation(summary = "Solicitar recuperação de senha — gera token e envia por e-mail")
    @PostMapping("/esqueci-senha")
    public ResponseEntity<EsqueciSenhaResponseDto> esqueciSenha(@Valid @RequestBody EsqueciSenhaRequestDto request) {
        return ResponseEntity.ok(passwordResetService.gerarTokenReset(request));
    }

    @Operation(summary = "Redefinir senha usando o token recebido por e-mail")
    @PostMapping("/redefinir-senha")
    public ResponseEntity<Void> redefinirSenha(@Valid @RequestBody RedefinirSenhaRequestDto request) {
        passwordResetService.redefinirSenha(request);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Atualizar nome e foto do usuário autenticado (senha: PATCH /api/auth/senha)")
    @PutMapping("/perfil")
    public ResponseEntity<MeResponseDto> atualizarPerfil(
            @Valid @RequestBody AtualizarPerfilRequestDto dto,
            Authentication authentication) {
        return ResponseEntity.ok(profileService.atualizarPerfil(authentication.getName(), dto));
    }

    @Operation(summary = "Trocar senha do usuário autenticado (revoga as demais sessões)")
    @PatchMapping("/senha")
    public ResponseEntity<Void> trocarSenha(@Valid @RequestBody TrocarSenhaRequestDto dto,
                                            Authentication authentication,
                                            HttpServletResponse response) {
        String novoToken = authService.trocarSenha(authentication.getName(), dto);
        response.addHeader(HttpHeaders.SET_COOKIE, jwtCookie(novoToken, tokenExpiration / 1000));
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Atualizar foto de perfil via multipart (PNG, JPEG, WebP ou GIF — validado pelo conteúdo)")
    @PostMapping("/foto")
    public ResponseEntity<MeResponseDto> uploadFoto(
            @RequestParam("foto") MultipartFile foto,
            Authentication authentication) throws IOException {
        // Tipo validado pelos magic bytes em ProfileService (o Content-Type do cliente é ignorado);
        // tamanho checado antes de ler o arquivo para a memória.
        if (foto.getSize() > ImagemPerfilValidator.TAMANHO_MAXIMO) {
            throw new IllegalArgumentException("A foto excede o tamanho máximo de 1,5 MB.");
        }
        return ResponseEntity.ok(profileService.atualizarFotoPerfil(authentication.getName(), foto.getBytes()));
    }

    private String jwtCookie(String value, long maxAgeSeconds) {
        return ResponseCookie.from(JwtFilter.COOKIE_TOKEN, value)
                .httpOnly(true)
                .secure(true)
                .sameSite(cookieSameSite)
                .path("/")
                .maxAge(maxAgeSeconds)
                .build()
                .toString();
    }
}
