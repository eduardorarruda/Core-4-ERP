package br.com.core4erp.config.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class PasswordConfig {

    /**
     * Custo do BCrypt (2^12 iterações). Hashes antigos (custo 10) continuam válidos — o custo
     * fica gravado no próprio hash — e passam a custo 12 na próxima troca de senha.
     * BCrypt só considera 72 bytes: os DTOs limitam senhas a 72 caracteres (CVE-2025-22228).
     */
    public static final int BCRYPT_STRENGTH = 12;

    /** Limite do BCrypt (bytes); usado como {@code @Size(max)} nos DTOs de senha. */
    public static final int SENHA_MAX = 72;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(BCRYPT_STRENGTH);
    }

}
