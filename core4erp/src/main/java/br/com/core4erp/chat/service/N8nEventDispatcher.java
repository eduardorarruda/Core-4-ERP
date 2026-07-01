package br.com.core4erp.chat.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Publica um evento de domínio para o n8n a cada AÇÃO feita pela Áurea (cadastro, lançamento, baixa,
 * transferência, estorno, relatório, ...). No n8n o usuário monta o fluxo de cada evento (notificar,
 * integrar, gerar/enviar relatório, etc.).
 *
 * <p><b>Arquitetura:</b> orientado a eventos e FORA do caminho crítico — o backend continua a fonte
 * da verdade. O envio é assíncrono (thread própria) e à prova de falha: se o n8n estiver fora, a
 * operação financeira NÃO é afetada. Habilitado quando {@code chat.n8n.eventos-webhook-url} está
 * configurado.
 */
@Component
public class N8nEventDispatcher {

    private static final Logger log = LoggerFactory.getLogger(N8nEventDispatcher.class);

    private final String webhookUrl;
    private final RestClient client;
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "n8n-eventos");
        t.setDaemon(true);
        return t;
    });

    public N8nEventDispatcher(@Value("${chat.n8n.eventos-webhook-url:}") String webhookUrl) {
        this.webhookUrl = webhookUrl;
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(3_000);
        f.setReadTimeout(8_000);
        this.client = RestClient.builder().requestFactory(f).build();
    }

    /** Enfileira o envio do evento ao n8n (não bloqueia a ação do usuário). */
    public void publicar(String acao, String detalhe, Long usuarioId, Long empresaId) {
        if (webhookUrl == null || webhookUrl.isBlank()) return;
        Map<String, Object> evento = new LinkedHashMap<>();
        evento.put("acao", acao);
        evento.put("detalhe", detalhe);
        evento.put("usuarioId", usuarioId);
        evento.put("empresaId", empresaId);
        evento.put("origem", "chat-ia");
        evento.put("timestamp", Instant.now().toString());
        executor.submit(() -> enviar(evento, acao));
    }

    private void enviar(Map<String, Object> evento, String acao) {
        try {
            client.post().uri(webhookUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(evento)
                    .retrieve()
                    .toBodilessEntity();
            log.debug("[N8N-EVENTO] enviado acao={}", acao);
        } catch (Exception e) {
            log.warn("[N8N-EVENTO] falha ao enviar acao={} (ignorado): {}", acao, e.getMessage());
        }
    }
}
