package br.com.core4erp.auth.service;

import br.com.core4erp.auth.dto.AtualizarPerfilRequestDto;
import br.com.core4erp.auth.dto.MeResponseDto;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Base64;

@Service
public class ProfileService {

    private static final String PREFIXO_DATA_URL = "data:";
    private static final String MARCADOR_BASE64 = ";base64,";

    private final UsuarioRepository usuarioRepository;

    public ProfileService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    /** Atualiza nome e foto. Troca de senha só por {@code PATCH /api/auth/senha} (exige a atual). */
    @Transactional
    public MeResponseDto atualizarPerfil(String email, AtualizarPerfilRequestDto dto) {
        Usuario usuario = findByEmail(email);
        usuario.setNome(dto.nome());
        if (dto.fotoPerfil() != null) {
            usuario.setFotoPerfil(normalizarFotoDataUrl(dto.fotoPerfil()));
        }
        return toMeResponse(usuarioRepository.save(usuario));
    }

    /**
     * Grava a foto como data URL usando o tipo DETECTADO pelos magic bytes — o Content-Type do
     * cliente é ignorado (era possível gravar {@code image/svg+xml} com script).
     */
    @Transactional
    public MeResponseDto atualizarFotoPerfil(String email, byte[] bytes) {
        String tipo = ImagemPerfilValidator.detectarTipo(bytes);
        Usuario usuario = findByEmail(email);
        usuario.setFotoPerfil(PREFIXO_DATA_URL + tipo + MARCADOR_BASE64 + Base64.getEncoder().encodeToString(bytes));
        return toMeResponse(usuarioRepository.save(usuario));
    }

    /** Foto via JSON (data URL/base64): vazio remove a foto; senão revalida o conteúdo real. */
    static String normalizarFotoDataUrl(String foto) {
        if (foto.isBlank()) return null;
        int marcador = foto.indexOf(MARCADOR_BASE64);
        String base64 = marcador >= 0 ? foto.substring(marcador + MARCADOR_BASE64.length()) : foto;
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Não foi possível ler a imagem enviada. Tente outro arquivo.");
        }
        String tipo = ImagemPerfilValidator.detectarTipo(bytes);
        return PREFIXO_DATA_URL + tipo + MARCADOR_BASE64 + base64;
    }

    private Usuario findByEmail(String email) {
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado"));
    }

    private MeResponseDto toMeResponse(Usuario u) {
        String tipoConta = u.getTipoConta() != null ? u.getTipoConta().name() : null;
        return new MeResponseDto(u.getId(), u.getNome(), u.getEmail(), u.getTelefone(), u.getRole(), u.getFotoPerfil(), tipoConta);
    }
}
