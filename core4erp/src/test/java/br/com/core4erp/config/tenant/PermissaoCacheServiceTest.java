package br.com.core4erp.config.tenant;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.junit.jupiter.api.Test;

import java.util.Objects;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PermissaoCacheServiceTest {

    private final Cache<String, Set<String>> cache = Caffeine.newBuilder().build();
    private final PermissaoCacheService service = new PermissaoCacheService(cache);

    @Test
    void chave_eHashHexDeEmailEEmpresa_semConcatenacao() {
        assertThat(PermissaoCacheService.chave("a:b@c.com", 1L))
                .isEqualTo(Integer.toHexString(Objects.hash("a:b@c.com", 1L)))
                .doesNotContain("@");
    }

    @Test
    void invalidar_removeExatamenteAChaveLidaPeloFiltro() {
        service.obter("a@b.com", 1L, () -> Set.of("X"));
        service.obter("a@b.com", 2L, () -> Set.of("Y"));

        service.invalidar("a@b.com", 1L);

        assertThat(cache.getIfPresent(PermissaoCacheService.chave("a@b.com", 1L))).isNull();
        assertThat(cache.getIfPresent(PermissaoCacheService.chave("a@b.com", 2L))).containsExactly("Y");
    }

    @Test
    void invalidarTodos_limpaCache() {
        service.obter("a@b.com", 1L, () -> Set.of("X"));
        service.invalidarTodos();
        assertThat(cache.estimatedSize()).isZero();
    }
}
