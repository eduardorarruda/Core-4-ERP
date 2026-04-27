package br.com.core4erp.auth.service;

import br.com.core4erp.auth.dto.AtualizarPerfilRequestDto;
import br.com.core4erp.auth.dto.LoginRequestDto;
import br.com.core4erp.auth.dto.MeResponseDto;
import br.com.core4erp.auth.dto.RegistrarRequestDto;
import br.com.core4erp.config.security.JwtService;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Base64;

@Service
public class AuthService {

    private static final int MAX_LOGIN_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    public record LoginResult(String token, MeResponseDto usuario) {}

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UsuarioRepository usuarioRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
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

    private MeResponseDto toMeResponse(Usuario u) {
        return new MeResponseDto(u.getId(), u.getNome(), u.getEmail(), u.getTelefone(), u.getRole(), u.getFotoPerfil());
    }
}
