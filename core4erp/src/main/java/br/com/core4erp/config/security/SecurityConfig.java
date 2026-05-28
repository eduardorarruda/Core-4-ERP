package br.com.core4erp.config.security;

import br.com.core4erp.config.tenant.TenantFilter;
import jakarta.servlet.DispatcherType;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        private final JwtFilter jwtFilter;
        private final RateLimitFilter rateLimitFilter;
        private final TenantFilter tenantFilter;

        public SecurityConfig(JwtFilter jwtFilter, RateLimitFilter rateLimitFilter, TenantFilter tenantFilter) {
                this.jwtFilter = jwtFilter;
                this.rateLimitFilter = rateLimitFilter;
                this.tenantFilter = tenantFilter;
        }

        @Bean
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                .cors(Customizer.withDefaults())
                                .csrf(csrf -> csrf.disable())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authorizeHttpRequests(auth -> auth
                                                // Libera dispatches assíncronos (CRÍTICO para SseEmitter/Streaming)
                                                .dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll()
                                                // Libera requisições de Preflight do CORS
                                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                                                // Rotas públicas
                                                .requestMatchers(
                                                                "/api/auth/registrar",
                                                                "/api/auth/login",
                                                                "/api/auth/esqueci-senha",
                                                                "/api/auth/redefinir-senha",
                                                                "/api/auth/convite/**",
                                                                "/api/auth/aceitar-convite",
                                                                "/api/planos/ativos",
                                                                "/v3/api-docs/**",
                                                                "/swagger-ui/**",
                                                                "/swagger-ui.html",
                                                                "/actuator/health",
                                                                "/actuator/prometheus")
                                                .permitAll()
                                                // Actuator protegido — scrape do Prometheus usa token ADMIN
                                                .requestMatchers("/actuator/**").hasRole("ADMIN")
                                                .anyRequest().authenticated())
                                .headers(headers -> headers
                                                .contentTypeOptions(Customizer.withDefaults())
                                                .frameOptions(frame -> frame.deny())
                                                .httpStrictTransportSecurity(hsts -> hsts
                                                                .includeSubDomains(true)
                                                                .maxAgeInSeconds(31_536_000)
                                                                .preload(false))
                                                .cacheControl(Customizer.withDefaults()))
                                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                                .addFilterAfter(tenantFilter, JwtFilter.class);

                return http.build();
        }

        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
                return config.getAuthenticationManager();
        }
}
