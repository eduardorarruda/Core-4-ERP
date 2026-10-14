package br.com.core4erp.config.security;

import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Optional;
import java.util.concurrent.TimeUnit;

/**
 * Dados de sessão do usuário autenticado usados pelos filtros a cada requisição (versão de token,
 * senha provisória, admin do sistema, tipo de conta e role). Cache Caffeine de 30 s — mesmo TTL do
 * cache de permissões — para não consultar {@code tb_usuario} várias vezes por requisição.
 *
 * <p>Toda mudança nesses campos DEVE chamar {@link #invalidar(String)} (ou
 * {@link #revogarTokens(Usuario)}), senão a mudança só vale após o TTL.
 */
@Service
public class SessaoUsuarioService {

    private static final long TTL_SEGUNDOS = 30;
    private static final long MAX_ENTRADAS = 10_000;

    /** Snapshot imutável do usuário para os filtros de segurança. */
    public record SessaoUsuario(Long id, String email, int tokenVersion, boolean senhaProvisoria,
                                boolean adminSistema, String tipoConta, String role) {

        static SessaoUsuario de(Usuario u) {
            return new SessaoUsuario(
                    u.getId(), u.getEmail(), u.getTokenVersion(),
                    Boolean.TRUE.equals(u.getSenhaProvisoria()),
                    Boolean.TRUE.equals(u.getAdminSistema()),
                    u.getTipoConta() != null ? u.getTipoConta().name() : Usuario.TipoConta.EMPRESA.name(),
                    u.getRole() != null ? u.getRole() : "ROLE_USER");
        }
    }

    /** Atributo de request onde o {@code JwtFilter} publica a sessão para os filtros seguintes. */
    public static final String ATRIBUTO_REQUEST = SessaoUsuarioService.class.getName() + ".sessao";

    private final UsuarioRepository usuarioRepository;
    private final Cache<String, SessaoUsuario> cache = Caffeine.newBuilder()
            .maximumSize(MAX_ENTRADAS)
            .expireAfterWrite(TTL_SEGUNDOS, TimeUnit.SECONDS)
            .build();

    public SessaoUsuarioService(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    /** Sessão do usuário pelo e-mail (cacheada); vazio se o usuário não existe mais. */
    public Optional<SessaoUsuario> buscar(String email) {
        if (email == null) return Optional.empty();
        SessaoUsuario s = cache.getIfPresent(email);
        if (s != null) return Optional.of(s);
        Optional<SessaoUsuario> carregada = usuarioRepository.findByEmail(email).map(SessaoUsuario::de);
        carregada.ifPresent(v -> cache.put(email, v));
        return carregada;
    }

    /**
     * Invalida a sessão cacheada agora e, se houver transação ativa, de novo após o commit —
     * evita que uma requisição concorrente recarregue o estado antigo antes do commit.
     */
    public void invalidar(String email) {
        if (email == null) return;
        cache.invalidate(email);
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    cache.invalidate(email);
                }
            });
        }
    }

    /**
     * Incrementa a versão de token do usuário (todos os JWT emitidos deixam de valer) e invalida
     * o cache. O chamador persiste a entidade (normalmente dentro da mesma transação).
     */
    public void revogarTokens(Usuario usuario) {
        usuario.setTokenVersion(usuario.getTokenVersion() + 1);
        invalidar(usuario.getEmail());
    }
}
