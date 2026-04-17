package br.com.core4erp.config.security;

import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityContextUtils {

    private final UsuarioRepository usuarioRepository;

    public SecurityContextUtils(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public String getEmail() {
        return SecurityContextHolder.getContext().getAuthentication().getName();
    }

    public Long getUsuarioId() {
        return getUsuario().getId();
    }

    public Usuario getUsuario() {
        String email = getEmail();
        return usuarioRepository.findByEmail(email)
                .orElseThrow(() -> new EntityNotFoundException("Usuário não encontrado: " + email));
    }
}
