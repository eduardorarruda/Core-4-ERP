package br.com.core4erp.config;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

import java.lang.reflect.Field;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * As duas listas de pacotes do {@link PrimaryJpaConfig} (repositórios e entidades) precisam andar
 * juntas: módulo novo fora delas sobe sem o repositório/entidade e o contexto não inicializa
 * (os testes unitários com mocks não percebem — só o boot real).
 */
class PrimaryJpaConfigPacotesTest {

    @Test
    void pacotesDeRepositorioEDeEntidade_iguais_eIncluemOrcamento() throws Exception {
        String[] repositorios = PrimaryJpaConfig.class.getAnnotation(EnableJpaRepositories.class).basePackages();
        Field campo = PrimaryJpaConfig.class.getDeclaredField("PRIMARY_PACKAGES");
        campo.setAccessible(true);
        String[] entidades = (String[]) campo.get(null);

        assertThat(repositorios).containsExactlyInAnyOrder(entidades);
        assertThat(entidades).contains("br.com.core4erp.orcamento");
    }
}
