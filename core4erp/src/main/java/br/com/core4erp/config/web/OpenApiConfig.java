package br.com.core4erp.config.web;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.servers.Server;
import org.springframework.context.annotation.Configuration;

@OpenAPIDefinition(
        info = @Info(
                title = "Core 4 ERP — API",
                version = "1.0.0",
                description = "API REST do sistema ERP financeiro. Endpoints protegidos exigem autenticação JWT via cookie httpOnly (produção) ou Bearer token (Swagger UI).",
                contact = @Contact(name = "Core 4 ERP", email = "suporte@core4erp.com.br")
        ),
        servers = {
                @Server(url = "/", description = "Servidor atual"),
        },
        security = @SecurityRequirement(name = "bearerAuth")
)
@SecurityScheme(
        name = "bearerAuth",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        in = SecuritySchemeIn.HEADER,
        description = "Cole o token JWT obtido em POST /api/auth/login (campo 'token' da resposta)"
)
@Configuration
public class OpenApiConfig {}
