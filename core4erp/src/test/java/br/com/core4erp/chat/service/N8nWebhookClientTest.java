package br.com.core4erp.chat.service;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class N8nWebhookClientTest {

    private HttpServer servidor;
    private final AtomicReference<String> segredoRecebido = new AtomicReference<>();
    private final java.util.concurrent.atomic.AtomicInteger chamadas = new java.util.concurrent.atomic.AtomicInteger();
    private String url;

    @BeforeEach
    void subirServidor() throws Exception {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/webhook", troca -> {
            chamadas.incrementAndGet();
            segredoRecebido.set(troca.getRequestHeaders().getFirst("X-Webhook-Secret"));
            byte[] corpo = "{\"texto\":\"ok\"}".getBytes(StandardCharsets.UTF_8);
            troca.getResponseHeaders().add("Content-Type", "application/json");
            troca.sendResponseHeaders(200, corpo.length);
            troca.getResponseBody().write(corpo);
            troca.close();
        });
        servidor.start();
        url = "http://127.0.0.1:" + servidor.getAddress().getPort() + "/webhook";
    }

    @AfterEach
    void pararServidor() {
        servidor.stop(0);
    }

    @Test
    void post_enviaXWebhookSecret() {
        N8nWebhookClient n8n = new N8nWebhookClient("s3gr3d0", true);
        RestClient cliente = n8n.novoCliente(Duration.ofSeconds(2), Duration.ofSeconds(2));

        Map<?, ?> resp = n8n.post(cliente, url).body(Map.of("a", 1)).retrieve().body(Map.class);

        assertEquals("s3gr3d0", segredoRecebido.get());
        assertEquals("ok", resp.get("texto"));
    }

    @Test
    void producaoSemSegredo_failClosed() {
        assertFalse(new N8nWebhookClient("", true).podeChamar());
        assertFalse(new N8nWebhookClient("   ", true).podeChamar());
        assertTrue(new N8nWebhookClient("x", true).podeChamar());
    }

    @Test
    void foraDeProducaoSemSegredo_permiteSemHeader() {
        N8nWebhookClient n8n = new N8nWebhookClient(null, false);
        assertTrue(n8n.podeChamar());
        n8n.post(n8n.novoCliente(Duration.ofSeconds(2), Duration.ofSeconds(2)), url)
                .body(Map.of()).retrieve().toBodilessEntity();
        assertNull(segredoRecebido.get());
    }

    @Test
    void eventDispatcher_naoPublicaQuandoFailClosed() throws Exception {
        N8nEventDispatcher dispatcher = new N8nEventDispatcher(url, new N8nWebhookClient("", true));
        dispatcher.publicar("Conta.criar", "Conta criar id=1", false, 1L, 1L);
        Thread.sleep(300);
        assertEquals(0, chamadas.get(), "nenhuma chamada deve chegar ao n8n");
    }
}
