package br.com.core4erp.config.observabilidade;

import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.util.ContextInitializer;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.logging.LoggingInitializationContext;
import org.springframework.boot.logging.logback.LogbackLoggingSystem;
import org.springframework.mock.env.MockEnvironment;

import java.io.ByteArrayOutputStream;
import java.io.PrintStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Carrega o logback-spring.xml REAL pelo LoggingSystem do Spring Boot e confere o contrato:
 * json → uma linha ECS por evento com MDC + chave-valor; texto → padrão legível; nada duplicado.
 */
class LogbackSpringConfigTest {

    private final PrintStream stdoutOriginal = System.out;

    @AfterEach
    void restaurar() throws Exception {
        System.setOut(stdoutOriginal);
        MDC.clear();
        LoggerContext ctx = (LoggerContext) LoggerFactory.getILoggerFactory();
        ctx.reset();
        new ContextInitializer(ctx).autoConfig();
    }

    private String logarCom(String formato) {
        ByteArrayOutputStream saida = new ByteArrayOutputStream();
        System.setOut(new PrintStream(saida, true, StandardCharsets.UTF_8));
        MockEnvironment env = new MockEnvironment()
                .withProperty("app.log.format", formato)
                .withProperty("spring.application.name", "core4erp");
        LogbackLoggingSystem sistema = new LogbackLoggingSystem(getClass().getClassLoader());
        sistema.beforeInitialize();
        sistema.initialize(new LoggingInitializationContext(env), "classpath:logback-spring.xml", null);

        MDC.put("requestId", "abc12345");
        MDC.put("ip", "198.51.100.1");
        LoggerFactory.getLogger("br.com.core4erp.teste").atWarn()
                .addKeyValue("evento", "acesso_negado")
                .log("linha1\nlinha2");
        System.out.flush();
        return saida.toString(StandardCharsets.UTF_8);
    }

    @Test
    void formatoJson_ecsComMdcEChaveValor_umaLinha() throws Exception {
        String saida = logarCom("json");
        String linha = saida.lines().filter(l -> l.contains("acesso_negado")).findFirst().orElseThrow();
        assertEquals(1, saida.lines().filter(l -> l.contains("acesso_negado")).count(), "sem duplicação");

        JsonNode json = new ObjectMapper().readTree(linha);
        assertEquals("abc12345", json.path("requestId").asText());
        assertEquals("198.51.100.1", json.path("ip").asText());
        assertEquals("acesso_negado", json.path("evento").asText());
        assertEquals("WARN", json.path("log").path("level").asText());
        assertEquals("linha1\nlinha2", json.path("message").asText());
        assertTrue(json.path("@timestamp").asText().endsWith("Z"));
    }

    @Test
    void formatoTexto_legivelComRequestIdEChaveValor() {
        String saida = logarCom("texto");
        assertFalse(saida.contains("\"@timestamp\""));
        assertTrue(saida.contains("reqId=abc12345"));
        assertTrue(saida.contains("evento=\"acesso_negado\"") || saida.contains("evento=acesso_negado"));
    }
}
