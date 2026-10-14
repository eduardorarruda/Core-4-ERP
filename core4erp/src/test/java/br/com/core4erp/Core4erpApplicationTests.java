package br.com.core4erp;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Sobe o contexto completo (Postgres + Qdrant reais). Só roda quando DB_URL está definido,
 * para que `./gradlew test` passe sem banco (CI); com banco, valida Flyway e ddl validate.
 */
@SpringBootTest
@EnabledIfEnvironmentVariable(named = "DB_URL", matches = ".+")
class Core4erpApplicationTests {

	@Test
	void contextLoads() {
	}

}
