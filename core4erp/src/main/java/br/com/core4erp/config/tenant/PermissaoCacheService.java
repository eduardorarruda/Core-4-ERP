package br.com.core4erp.config.tenant;

import com.github.benmanes.caffeine.cache.Cache;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.Objects;
import java.util.Set;
import java.util.function.Supplier;

/**
 * Ponto ÚNICO de acesso ao cache de permissões efetivas (Caffeine, TTL 30 s).
 *
 * <p>Chave: {@code Integer.toHexString(Objects.hash(email, empresaId))} — nunca
 * {@code email + ":" + empresaId} (e-mails com ':' colidiriam). TenantFilter e todos os services
 * que mudam perfil/permissão/vínculo DEVEM usar esta classe, para leitura e invalidação usarem
 * exatamente a mesma chave.
 *
 * <p>A invalidação acontece imediatamente E novamente após o commit da transação corrente — assim
 * uma requisição concorrente que recarregue o cache antes do commit não deixa permissões antigas
 * valendo por mais 30 s.
 */
@Service
public class PermissaoCacheService {

    private final Cache<String, Set<String>> permissaoCache;

    public PermissaoCacheService(Cache<String, Set<String>> permissaoCache) {
        this.permissaoCache = permissaoCache;
    }

    public static String chave(String email, Long empresaId) {
        return Integer.toHexString(Objects.hash(email, empresaId));
    }

    public Set<String> obter(String email, Long empresaId, Supplier<Set<String>> calcular) {
        return permissaoCache.get(chave(email, empresaId), k -> calcular.get());
    }

    public void invalidar(String email, Long empresaId) {
        String chave = chave(email, empresaId);
        permissaoCache.invalidate(chave);
        aposCommit(() -> permissaoCache.invalidate(chave));
    }

    /** Mudança em um perfil afeta todos os usuários que o usam — limpa o cache inteiro. */
    public void invalidarTodos() {
        permissaoCache.invalidateAll();
        aposCommit(permissaoCache::invalidateAll);
    }

    private static void aposCommit(Runnable acao) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) return;
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                acao.run();
            }
        });
    }
}
