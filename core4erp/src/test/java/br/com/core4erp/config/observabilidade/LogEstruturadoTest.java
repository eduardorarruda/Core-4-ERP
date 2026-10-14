package br.com.core4erp.config.observabilidade;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.OutputStreamAppender;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.boot.logging.logback.StructuredLogEncoder;
import org.springframework.core.env.Environment;
import org.springframework.mock.env.MockEnvironment;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Garante o contrato do log JSON (formato ECS nativo do Boot 3.5, o mesmo do logback-spring.xml):
 * MDC e pares chave-valor do SLF4J como campos, timestamp ISO-8601 em UTC e CR/LF escapados.
 */
class LogEstruturadoTest {

    private final ByteArrayOutputStream saida = new ByteArrayOutputStream();
    private OutputStreamAppender<ILoggingEvent> appender;
    private Logger logger;

    @BeforeEach
    void configurar() {
        LoggerContext ctx = (LoggerContext) LoggerFactory.getILoggerFactory();
        ctx.putObject(Environment.class.getName(),
                new MockEnvironment().withProperty("spring.application.name", "core4erp"));

        StructuredLogEncoder encoder = new StructuredLogEncoder();
        encoder.setContext(ctx);
        encoder.setFormat("ecs");
        encoder.start();

        appender = new OutputStreamAppender<>();
        appender.setContext(ctx);
        appender.setEncoder(encoder);
        appender.setOutputStream(saida);
        appender.start();

        logger = ctx.getLogger("teste.log.estruturado");
        logger.setAdditive(false);
        logger.setLevel(Level.INFO);
        logger.addAppender(appender);
    }

    @AfterEach
    void limpar() {
        logger.detachAppender(appender);
        appender.stop();
        MDC.clear();
    }

    @Test
    void json_incluiMdcEParesChaveValor() throws Exception {
        MDC.put("requestId", "req-12345678");
        MDC.put("usuarioId", "42");
        MDC.put("empresaId", "7");
        MDC.put("ip", "203.0.113.9");

        org.slf4j.LoggerFactory.getLogger("teste.log.estruturado").atWarn()
                .addKeyValue("evento", "login_falhou")
                .addKeyValue("tentativas", 3)
                .log("evento de segurança");

        JsonNode json = new ObjectMapper().readTree(saida.toString(StandardCharsets.UTF_8));
        assertEquals("req-12345678", json.path("requestId").asText());
        assertEquals("42", json.path("usuarioId").asText());
        assertEquals("7", json.path("empresaId").asText());
        assertEquals("203.0.113.9", json.path("ip").asText());
        assertEquals("login_falhou", json.path("evento").asText());
        assertEquals("3", json.path("tentativas").asText());
        assertEquals("WARN", json.path("log").path("level").asText());
        assertEquals("evento de segurança", json.path("message").asText());
    }

    @Test
    void json_timestampIso8601EmUtc() throws Exception {
        org.slf4j.LoggerFactory.getLogger("teste.log.estruturado").info("ok");

        JsonNode json = new ObjectMapper().readTree(saida.toString(StandardCharsets.UTF_8));
        String ts = json.path("@timestamp").asText();
        assertTrue(ts.endsWith("Z"), "timestamp deve estar em UTC (sufixo Z): " + ts);
        java.time.Instant.parse(ts); // ISO-8601 válido
    }

    @Test
    void json_escapaCrLf_impedeForjarLinhas() throws Exception {
        org.slf4j.LoggerFactory.getLogger("teste.log.estruturado")
                .info("usuario digitou\r\n{\"log.level\":\"ERROR\",\"message\":\"forjado\"}");

        String bruto = saida.toString(StandardCharsets.UTF_8).strip();
        assertFalse(bruto.contains("\n"), "o evento deve ocupar uma única linha");
        assertFalse(bruto.contains("\r"));
        JsonNode json = new ObjectMapper().readTree(bruto);
        assertEquals("INFO", json.path("log").path("level").asText());
        assertTrue(json.path("message").asText().contains("\r\n"));
    }

    @Test
    void filtroFormato_habilitaSomenteOAppenderDoFormatoAtivo() {
        FiltroFormatoLog json = filtro("json", "json");
        FiltroFormatoLog texto = filtro("json", "texto");
        assertEquals(ch.qos.logback.core.spi.FilterReply.NEUTRAL, json.decide(null));
        assertEquals(ch.qos.logback.core.spi.FilterReply.DENY, texto.decide(null));
    }

    @Test
    void filtroFormato_valorInvalidoOuVazio_caiEmTexto() {
        assertEquals("texto", FiltroFormatoLog.normalizar(null));
        assertEquals("texto", FiltroFormatoLog.normalizar(""));
        assertEquals("texto", FiltroFormatoLog.normalizar("xml"));
        assertEquals("json", FiltroFormatoLog.normalizar(" JSON "));
        assertEquals("json", FiltroFormatoLog.normalizar("ecs"));
    }

    private static FiltroFormatoLog filtro(String ativo, String doAppender) {
        FiltroFormatoLog f = new FiltroFormatoLog();
        f.setFormatoAtivo(ativo);
        f.setFormatoDoAppender(doAppender);
        f.start();
        return f;
    }
}
