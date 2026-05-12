package br.com.core4erp.auth.service;

import br.com.core4erp.auth.dto.AtualizarPerfilRequestDto;
import br.com.core4erp.auth.dto.EsqueciSenhaRequestDto;
import br.com.core4erp.auth.dto.EsqueciSenhaResponseDto;
import br.com.core4erp.auth.dto.LoginRequestDto;
import br.com.core4erp.auth.dto.MeResponseDto;
import br.com.core4erp.auth.dto.RedefinirSenhaRequestDto;
import br.com.core4erp.auth.dto.RegistrarRequestDto;
import br.com.core4erp.config.security.JwtService;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class AuthService {

    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;
    private static final int RESET_TOKEN_EXPIRY_MINUTES = 60;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public record LoginResult(String token, MeResponseDto usuario) {}

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;
    private final TransactionTemplate tx;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public AuthService(UsuarioRepository usuarioRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       EmailService emailService,
                       @Qualifier("transactionManager") PlatformTransactionManager txManager) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.emailService = emailService;
        this.tx = new TransactionTemplate(txManager);
    }

    @Transactional
    public MeResponseDto registrar(RegistrarRequestDto request) {
        if (usuarioRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email já cadastrado");
        }

        Usuario usuario = new Usuario();
        usuario.setNome(request.nome());
        usuario.setEmail(request.email());
        usuario.setSenhaHash(passwordEncoder.encode(request.senha()));
        usuario.setTelefone(request.telefone());
        usuario.setRole("ROLE_USER");

        usuario = usuarioRepository.save(usuario);
        return toMeResponse(usuario);
    }

    @Transactional
    public LoginResult login(LoginRequestDto request) {
        Usuario usuario = usuarioRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException("Credenciais inválidas"));

        if (usuario.getLockedUntil() != null && usuario.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new LockedException("Conta bloqueada temporariamente. Tente novamente em " + LOCKOUT_MINUTES + " minutos.");
        }

        if (!passwordEncoder.matches(request.senha(), usuario.getSenhaHash())) {
            int attempts = usuario.getLoginAttempts() + 1;
            if (attempts >= MAX_LOGIN_ATTEMPTS) {
                usuario.setLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES));
                usuario.setLoginAttempts(0);
            } else {
                usuario.setLoginAttempts(attempts);
            }
            usuarioRepository.save(usuario);
            throw new BadCredentialsException("Credenciais inválidas");
        }

        usuario.setLoginAttempts(0);
        usuario.setLockedUntil(null);
        usuarioRepository.save(usuario);

        String token = jwtService.generateToken(usuario.getEmail());
        return new LoginResult(token, toMeResponse(usuario));
    }

    public MeResponseDto me(String email) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado"));
        return toMeResponse(usuario);
    }

    @Transactional
    public MeResponseDto atualizarPerfil(String email, AtualizarPerfilRequestDto dto) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado"));
        usuario.setNome(dto.nome());
        if (dto.novaSenha() != null && !dto.novaSenha().isBlank()) {
            usuario.setSenhaHash(passwordEncoder.encode(dto.novaSenha()));
        }
        if (dto.fotoPerfil() != null) {
            usuario.setFotoPerfil(dto.fotoPerfil());
        }
        return toMeResponse(usuarioRepository.save(usuario));
    }

    @Transactional
    public MeResponseDto atualizarFotoPerfil(String email, byte[] bytes, String contentType) {
        Usuario usuario = usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado"));
        String base64 = "data:" + contentType + ";base64," + Base64.getEncoder().encodeToString(bytes);
        usuario.setFotoPerfil(base64);
        return toMeResponse(usuarioRepository.save(usuario));
    }

    /**
     * Gera token de reset e envia e-mail. O token é persistido em transação própria
     * que commita ANTES do envio, garantindo que a falha de SMTP não reverta o token.
     */
    public EsqueciSenhaResponseDto gerarTokenReset(EsqueciSenhaRequestDto request) {
        // 1. Persiste o token numa transação que commita imediatamente
        String[] resultado = tx.execute(status -> {
            Usuario usuario = usuarioRepository.findByEmail(request.email()).orElse(null);
            if (usuario == null) return null;

            byte[] bytes = new byte[24];
            SECURE_RANDOM.nextBytes(bytes);
            String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

            usuario.setResetToken(token);
            usuario.setResetTokenExpiry(LocalDateTime.now().plusMinutes(RESET_TOKEN_EXPIRY_MINUTES));
            usuarioRepository.save(usuario);

            return new String[]{token, usuario.getEmail()};
        });

        // 2. Envia o e-mail FORA da transação — falha aqui não reverte o token
        if (resultado != null) {
            emailService.enviarResetSenha(resultado[1], resultado[0], frontendUrl);
        }

        return new EsqueciSenhaResponseDto(
                "Se este e-mail estiver cadastrado, você receberá as instruções de recuperação."
        );
    }

    @Transactional
    public void redefinirSenha(RedefinirSenhaRequestDto request) {
        Usuario usuario = usuarioRepository.findByResetToken(request.token())
                .orElseThrow(() -> new IllegalArgumentException("Token inválido ou expirado."));

        if (usuario.getResetTokenExpiry() == null ||
                usuario.getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            usuario.setResetToken(null);
            usuario.setResetTokenExpiry(null);
            usuarioRepository.save(usuario);
            throw new IllegalArgumentException("Token inválido ou expirado.");
        }

        usuario.setSenhaHash(passwordEncoder.encode(request.novaSenha()));
        usuario.setResetToken(null);
        usuario.setResetTokenExpiry(null);
        usuario.setLoginAttempts(0);
        usuario.setLockedUntil(null);
        usuarioRepository.save(usuario);
    }

    private MeResponseDto toMeResponse(Usuario u) {
        return new MeResponseDto(u.getId(), u.getNome(), u.getEmail(), u.getTelefone(), u.getRole(), u.getFotoPerfil());
    }
}
