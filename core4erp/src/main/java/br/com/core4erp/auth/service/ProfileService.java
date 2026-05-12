package br.com.core4erp.auth.service;

import br.com.core4erp.auth.dto.AtualizarPerfilRequestDto;
import br.com.core4erp.auth.dto.MeResponseDto;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;

@Service
public class ProfileService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public ProfileService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public MeResponseDto atualizarPerfil(String email, AtualizarPerfilRequestDto dto) {
        Usuario usuario = findByEmail(email);
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
        Usuario usuario = findByEmail(email);
        String base64 = "data:" + contentType + ";base64," + Base64.getEncoder().encodeToString(bytes);
        usuario.setFotoPerfil(base64);
        return toMeResponse(usuarioRepository.save(usuario));
    }

    private Usuario findByEmail(String email) {
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado"));
    }

    private MeResponseDto toMeResponse(Usuario u) {
        return new MeResponseDto(u.getId(), u.getNome(), u.getEmail(), u.getTelefone(), u.getRole(), u.getFotoPerfil());
    }
}
