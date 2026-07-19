package br.com.core4erp.chat.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Delega a orquestração do chat (a Áurea) ao workflow WF-ROUTER do n8n via webhook
 * ({@code POST /webhook/aurea}). Só é acionado quando {@code chat.orquestrador=n8n} — ver
 * {@link ChatService}. Enquanto a flag estiver em {@code interno} (padrão), este serviço fica
 * dormente e nenhum de seus métodos é chamado.
 *
 * <p><b>Falha graciosa (Plano B do plano de migração):</b> qualquer erro na chamada ao n8n
 * (timeout, conexão recusada, status HTTP de erro, corpo inválido) resulta em
 * {@link Optional#empty()}, que o {@code ChatService} interpreta como sinal para usar o pipeline
 * interno (Spring AI in-process). Nenhuma exceção é propagada ao chamador — o chat nunca cai por
 * causa do n8n. Rollback instantâneo trocando a env {@code CHAT_ORQUESTRADOR} de volta para
 * {@code interno}.</p>
 *
 * <p>Contrato do payload: Anexo A.1 do {@code Plano_Migracao_n8n.md}.</p>
 */
@Service
public class N8nChatOrquestradorService {

    private static final Logger log = LoggerFactory.getLogger(N8nChatOrquestradorService.class);

    private final String webhookUrl;
    private final String webhookSecret;
    private final RestClient client;

    public N8nChatOrquestradorService(
            @Value("${chat.n8n.aurea-webhook-url:http://n8n:5678/webhook/aurea}") String webhookUrl,
            @Value("${chat.n8n.webhook-secret:}") String webhookSecret) {
        this.webhookUrl = webhookUrl;
        this.webhookSecret = webhookSecret;
        // Timeout explícito (CLAUDE.md §21): conexão curta; leitura ~60s — o roteador do n8n
        // encadeia agente + tools + memória Postgres antes de responder (Respond to Webhook).
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5_000);
        f.setReadTimeout(60_000);
        this.client = RestClient.builder().requestFactory(f).build();
    }

    /**
     * Envia a mensagem ao WF-ROUTER e devolve o texto markdown da resposta.
     *
     * @param jwt token bruto do usuário (o n8n o repassa como {@code Authorization: Bearer} ao
     *            chamar as tools de volta na API do backend). Não deve ser nulo/vazio — o chamador
     *            já garante isso antes de invocar.
     * @return {@code Optional.of(resposta)} em sucesso; {@code Optional.empty()} em QUALQUER falha
     *         (sinal para o {@code ChatService} cair no pipeline interno).
     */
    public Optional<String> orquestrar(Long conversaId, Long usuarioId, Long empresaId, String canal,
                                       String mensagem, boolean pensamentoEstendido, String jwt) {
        String requestId = MDC.get("requestId");
        try {
            Map<String, Object> corpo = new LinkedHashMap<>();
            corpo.put("conversaId", conversaId);
            corpo.put("usuarioId", usuarioId);
            corpo.put("empresaId", empresaId);
            corpo.put("canal", canal);
            corpo.put("mensagem", mensagem);
            corpo.put("pensamentoEstendido", pensamentoEstendido);
            corpo.put("jwt", jwt);

            RestClient.RequestBodySpec spec = client.post().uri(webhookUrl)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + jwt);
            if (webhookSecret != null && !webhookSecret.isBlank()) {
                spec = spec.header("X-Webhook-Secret", webhookSecret);
            }

            RespostaWebhook body = spec.body(corpo)
                    .retrieve()
                    .body(RespostaWebhook.class);

            if (body == null || body.resposta() == null || body.resposta().isBlank()) {
                log.warn("[CHAT-N8N] resposta do orquestrador vazia ou sem campo 'resposta' — requestId={} — fallback interno", requestId);
                return Optional.empty();
            }
            return Optional.of(body.resposta());
        } catch (Exception e) {
            // Sem dados sensíveis no log — apenas requestId e a mensagem técnica curta.
            log.warn("[CHAT-N8N] falha ao orquestrar via n8n — requestId={} — fallback interno: {}",
                    requestId, e.getMessage());
            return Optional.empty();
        }
    }

    /** Corpo da resposta do WF-ROUTER (Anexo A.1). Só {@code resposta} é usado aqui. */
    private record RespostaWebhook(String resposta, String agente, Object acoes) {}
}
