package br.com.core4erp.config.env;

import io.github.cdimascio.dotenv.Dotenv;

/**
 * Carrega variáveis do arquivo .env para System.setProperty antes do contexto Spring inicializar.
 * Instanciado explicitamente em Core4erpApplication.main() via new EnvConfig().
 */
public class EnvConfig {
    static {
        Dotenv dotenv = Dotenv.configure()
                .ignoreIfMalformed()
                .ignoreIfMissing()
                .load();

        dotenv.entries().forEach(entry -> {
            if (System.getProperty(entry.getKey()) == null) {
                System.setProperty(entry.getKey(), entry.getValue());
            }
        });
    }
}
