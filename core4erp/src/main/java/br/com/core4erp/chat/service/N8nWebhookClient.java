package br.com.core4erp.chat.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;

/**
 * Ponto único de chamada aos webhooks do n8n (pré-processamento de anexo, orquestrador da Áurea e
 * eventos de domínio). Centraliza:
 * <ul>
 *   <li>criação do {@link RestClient} com timeouts explícitos (CLAUDE.md §21);</li>
 *   <li>assinatura do header {@code X-Webhook-Secret} ({@code N8N_WEBHOOK_SECRET});</li>
 *   <li><b>fail closed</b> em produção: no perfil {@code prod} os webhooks do n8n exigem autenticação
 *       — sem segredo configurado nenhuma chamada é feita ({@link #podeChamar()} = false) e um ERROR é
 *       registrado na subida. Fora de produção (dev) a chamada sem segredo é permitida, com aviso.</li>
 * </ul>
 */
@Component
public class N8nWebhookClient {

    private static final Logger log = LoggerFactory.getLogger(N8nWebhookClient.class);

    static final String HEADER_SEGREDO = "X-Webhook-Secret";

    private final String segredo;
    private final boolean producao;

    @Autowired
    public N8nWebhookClient(@Value("${chat.n8n.webhook-secret:}") String segredo, Environment environment) {
        this(segredo, environment.acceptsProfiles(Profiles.of("prod")));
    }

    N8nWebhookClient(String segredo, boolean producao) {
        this.segredo = segredo == null ? "" : segredo.strip();
        this.producao = producao;
    }

    @PostConstruct
    void validarNaSubida() {
        if (!segredo.isEmpty()) {
            return;
        }
        if (producao) {
            log.atError()
                    .addKeyValue("evento", "n8n.segredo_ausente")
                    .log("[N8N] N8N_WEBHOOK_SECRET vazio no perfil prod — chamadas ao n8n DESATIVADAS (fail closed)."
                            + " Configure o segredo no .env e no n8n para reativar.");
        } else {
            log.warn("[N8N] N8N_WEBHOOK_SECRET vazio — webhooks do n8n serão chamados SEM autenticação (apenas fora de prod).");
        }
    }

    /** {@code false} quando a chamada deve ser suprimida (produção sem segredo). */
    public boolean podeChamar() {
        return !segredo.isEmpty() || !producao;
    }

    /** Cria um cliente HTTP com timeouts explícitos de conexão e leitura. */
    public RestClient novoCliente(Duration conexao, Duration leitura) {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout((int) conexao.toMillis());
        f.setReadTimeout((int) Math.max(1_000, leitura.toMillis()));
        return RestClient.builder().requestFactory(f).build();
    }

    /** Prepara um POST JSON para o webhook, já assinado com {@code X-Webhook-Secret} (quando houver). */
    public RestClient.RequestBodySpec post(RestClient cliente, String url) {
        RestClient.RequestBodySpec spec = cliente.post().uri(url).contentType(MediaType.APPLICATION_JSON);
        if (!segredo.isEmpty()) {
            spec = spec.header(HEADER_SEGREDO, segredo);
        }
        return spec;
    }
}
