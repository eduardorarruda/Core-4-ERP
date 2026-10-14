package br.com.core4erp.config.security;

import br.com.core4erp.config.tenant.TenantFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.RequestMatcher;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import br.com.core4erp.config.web.CorsProcessorJson;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

        private final JwtFilter jwtFilter;
        private final RateLimitFilter rateLimitFilter;
        private final TenantFilter tenantFilter;
        private final ObjectMapper objectMapper;
        private final CorsConfigurationSource corsConfigurationSource;

        public SecurityConfig(JwtFilter jwtFilter, RateLimitFilter rateLimitFilter, TenantFilter tenantFilter,
                              ObjectMapper objectMapper,
                              // Qualifier: o HandlerMappingIntrospector do MVC também implementa CorsConfigurationSource
                              @Qualifier("corsConfigurationSource") CorsConfigurationSource corsConfigurationSource) {
                this.jwtFilter = jwtFilter;
                this.rateLimitFilter = rateLimitFilter;
                this.tenantFilter = tenantFilter;
                this.objectMapper = objectMapper;
                this.corsConfigurationSource = corsConfigurationSource;
        }

        /**
         * Cadeia da PORTA DE GERENCIAMENTO ({@code management.server.port}, 8081 — só rede interna
         * do compose). Avaliada primeiro e restrita às requisições que chegam nessa porta, onde
         * apenas o Actuator é servido (health/prometheus). Não depende de usuário/role: o isolamento
         * é de rede. Sem porta de gerenciamento separada, esta cadeia não casa com nada.
         */
        @Bean
        @Order(1)
        public SecurityFilterChain actuatorSecurityFilterChain(
                        HttpSecurity http,
                        @Value("${management.server.port:-1}") int managementPort,
                        @Value("${server.port:8080}") int serverPort) throws Exception {
                http
                                .securityMatcher(portaDeGerenciamento(managementPort, serverPort))
                                .csrf(csrf -> csrf.disable())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
                return http.build();
        }

        static RequestMatcher portaDeGerenciamento(int managementPort, int serverPort) {
                boolean portaSeparada = managementPort > 0 && managementPort != serverPort;
                return request -> portaSeparada && request.getLocalPort() == managementPort;
        }

        @Bean
        @Order(2)
        public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
                http
                                // CORS com recusa em JSON padrão (403) — mesmo CorsFilter do Spring Security, só
                                // trocando o processador; a allowlist continua em corsConfigurationSource.
                                .cors(cors -> cors.disable())
                                .addFilterAt(CorsProcessorJson.filtro(corsConfigurationSource, objectMapper),
                                                CorsFilter.class)
                                // CSRF clássico desligado (API stateless); defesa: cookie SameSite=Lax +
                                // OrigemRequisicaoFilter (Origin/Referer na allowlist quando há cookie).
                                .csrf(csrf -> csrf.disable())
                                .sessionManagement(session -> session
                                                .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                                .exceptionHandling(ex -> ex.authenticationEntryPoint(
                                                (request, response, e) -> naoAutenticado(request, response)))
                                .authorizeHttpRequests(auth -> auth
                                                // Libera dispatches assíncronos (CRÍTICO para SseEmitter/Streaming)
                                                .dispatcherTypeMatchers(DispatcherType.ASYNC).permitAll()
                                                // Libera requisições de Preflight do CORS
                                                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                                                // A porta pública NUNCA serve o Actuator (só a 8081, interna)
                                                .requestMatchers("/actuator", "/actuator/**").denyAll()
                                                // Rotas públicas
                                                .requestMatchers(
                                                                "/api/auth/registrar",
                                                                "/api/auth/login",
                                                                "/api/auth/esqueci-senha",
                                                                "/api/auth/redefinir-senha",
                                                                "/api/auth/convite/**",
                                                                "/api/auth/aceitar-convite",
                                                                "/api/planos/ativos")
                                                .permitAll()
                                                // Documentação: em produção o springdoc é desligado
                                                // (application-prod) e estas rotas respondem 404.
                                                .requestMatchers(
                                                                "/v3/api-docs/**",
                                                                "/swagger-ui/**",
                                                                "/swagger-ui.html")
                                                .permitAll()
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
                                .addFilterBefore(new OrigemRequisicaoFilter(corsConfigurationSource, objectMapper),
                                                JwtFilter.class)
                                .addFilterAfter(tenantFilter, JwtFilter.class)
                                .addFilterAfter(new SenhaProvisoriaFilter(objectMapper), TenantFilter.class);

                return http.build();
        }

        private void naoAutenticado(HttpServletRequest request, HttpServletResponse response)
                        throws java.io.IOException {
                RespostaErroJson.escrever(response, objectMapper, HttpServletResponse.SC_UNAUTHORIZED,
                                "NAO_AUTENTICADO", "Sua sessão expirou ou é inválida. Entre novamente.");
        }

        @Bean
        public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
                return config.getAuthenticationManager();
        }
}
