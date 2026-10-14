package br.com.core4erp.config.security;

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
 * Garante que eventos de segurança com chaves que também estão no MDC não são descartados
 * pelo encoder ECS ("Duplicate nested pairs") — regressão vista no E2E.
 */
class EventoSegurancaBuilderTest {

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

        logger = ctx.getLogger(EventoSeguranca.LOGGER);
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

    private JsonNode unicoEvento() throws Exception {
        String texto = saida.toString(StandardCharsets.UTF_8).trim();
        assertFalse(texto.isEmpty(), "o evento foi descartado pelo encoder");
        assertEquals(1, texto.lines().count());
        return new ObjectMapper().readTree(texto);
    }

    @Test
    void chaveIgualAoMdcComMesmoValor_eOmitidaEEventoSai() throws Exception {
        MDC.put("usuarioId", "42");
        MDC.put("empresaId", "7");

        EventoSeguranca.warn(EventoSeguranca.PERMISSAO_NEGADA)
                .addKeyValue("usuarioId", 42L)
                .addKeyValue("empresaId", 7L)
                .addKeyValue("permissao", "CONTA_DELETAR")
                .log("Permissão negada");

        JsonNode json = unicoEvento();
        assertEquals("PERMISSAO_NEGADA", json.path("evento").asText());
        assertEquals("42", json.path("usuarioId").asText());
        assertEquals("7", json.path("empresaId").asText());
        assertEquals("CONTA_DELETAR", json.path("permissao").asText());
        assertTrue(json.path("usuarioIdAlvo").isMissingNode());
    }

    @Test
    void chaveIgualAoMdcComOutroValor_viraAlvo() throws Exception {
        MDC.put("usuarioId", "42");
        MDC.put("empresaId", "7");

        EventoSeguranca.info(EventoSeguranca.PERFIL_ALTERADO)
                .addKeyValue("usuarioId", 99L)
                .addKeyValue("empresaId", 7L)
                .log("Perfil alterado");

        JsonNode json = unicoEvento();
        assertEquals("42", json.path("usuarioId").asText());
        assertEquals("99", json.path("usuarioIdAlvo").asText());
        assertTrue(json.path("empresaIdAlvo").isMissingNode());
    }

    @Test
    void chaveRepetidaNoMesmoEvento_eIgnorada() throws Exception {
        EventoSeguranca.warn(EventoSeguranca.LOGIN_FALHA)
                .addKeyValue("emailHash", "abc")
                .addKeyValue("emailHash", "def")
                .addKeyValue("evento", "OUTRO")
                .log("Falha de login");

        JsonNode json = unicoEvento();
        assertEquals("abc", json.path("emailHash").asText());
        assertEquals("LOGIN_FALHA", json.path("evento").asText());
    }

    @Test
    void semMdc_mantemChavesOriginais() throws Exception {
        EventoSeguranca.info(EventoSeguranca.REGISTRO)
                .addKeyValue("usuarioId", 5L)
                .log("Registro");

        JsonNode json = unicoEvento();
        assertEquals("5", json.path("usuarioId").asText());
    }
}
