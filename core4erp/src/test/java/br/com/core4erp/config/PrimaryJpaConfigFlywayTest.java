package br.com.core4erp.config;

import org.flywaydb.core.api.configuration.FluentConfiguration;
import org.flywaydb.core.api.pattern.ValidatePattern;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import javax.sql.DataSource;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * Garante que o Flyway configurado programaticamente respeita as propriedades spring.flyway.*
 * (o FlywayAutoConfiguration está excluído) — em especial o modo estrito de produção.
 */
class PrimaryJpaConfigFlywayTest {

    private final DataSource dataSource = mock(DataSource.class);

    @Test
    void semPropriedades_usaDefaultsTolerantesDoPerfilDev() {
        FluentConfiguration cfg = PrimaryJpaConfig.configurarFlyway(dataSource, new MockEnvironment());

        assertThat(cfg.isOutOfOrder()).isTrue();
        assertThat(cfg.isBaselineOnMigrate()).isTrue();
        assertThat(cfg.getBaselineVersion().getVersion()).isEqualTo("1");
        assertThat(padroes(cfg)).containsExactly("*:missing");
        assertThat(cfg.getLocations()).extracting(Object::toString).containsExactly("classpath:db/migration");
    }

    @Test
    void propriedadesDeProducao_saoAplicadas() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("spring.flyway.out-of-order", "false")
                .withProperty("spring.flyway.ignore-migration-patterns", "*:future");

        FluentConfiguration cfg = PrimaryJpaConfig.configurarFlyway(dataSource, env);

        assertThat(cfg.isOutOfOrder()).isFalse();
        assertThat(padroes(cfg)).containsExactly("*:future");
    }

    @Test
    void listaDePadroesSeparadaPorVirgula_eAceita() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("spring.flyway.ignore-migration-patterns", "*:missing,*:future");

        FluentConfiguration cfg = PrimaryJpaConfig.configurarFlyway(dataSource, env);

        assertThat(padroes(cfg)).containsExactly("*:missing", "*:future");
    }

    private static String[] padroes(FluentConfiguration cfg) {
        return Arrays.stream(cfg.getIgnoreMigrationPatterns()).map(ValidatePattern::toString).toArray(String[]::new);
    }
}
