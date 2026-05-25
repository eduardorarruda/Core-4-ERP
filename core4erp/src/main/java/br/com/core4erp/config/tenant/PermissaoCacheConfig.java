package br.com.core4erp.config.tenant;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Set;
import java.util.concurrent.TimeUnit;

@Configuration
public class PermissaoCacheConfig {

    @Bean
    public Cache<String, Set<String>> permissaoCache() {
        return Caffeine.newBuilder()
            .maximumSize(1000)
            .expireAfterWrite(30, TimeUnit.SECONDS)
            .build();
    }
}
