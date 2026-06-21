package br.com.core4erp.config.security;

import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Resolve o usuário autenticado a partir do {@link SecurityContextHolder}.
 *
 * <p>Singleton e sem estado mutável: depende apenas do contexto de segurança ligado à
 * thread (ThreadLocal). Isso permite que funcione corretamente também em threads de
 * trabalho assíncronas (ex.: o processamento do chat por streaming), desde que o
 * {@code SecurityContext} seja restaurado nessas threads — algo que um bean
 * {@code @RequestScope} não permitia, pois exigia uma requisição HTTP ativa.
 */
@Component
public class SecurityContextUtils {

    private final UsuarioRepository usuarioRepository;

    public SecurityContextUtils(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    public String getEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new IllegalStateException("Nenhum usuário autenticado no contexto de segurança");
        }
        return auth.getName();
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
