package br.com.core4erp.config.env;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.context.annotation.Configuration;

@Configuration
public class EnvConfig {
    static {
        Dotenv dotenv = Dotenv.configure()
                .ignoreIfMalformed()
                .ignoreIfMissing()
                .load();

        for (String key : new String[]{"DB_URL", "DB_USERNAME", "DB_PASSWORD", "SECRET_KEY", "CORS_ORIGINS", "TOKEN_EXPIRATION"}) {
            String value = dotenv.get(key);
            if (value != null) {
                System.setProperty(key, value);
            }
        }
    }
}
