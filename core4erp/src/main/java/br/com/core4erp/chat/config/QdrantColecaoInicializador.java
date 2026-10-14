package br.com.core4erp.chat.config;

import br.com.core4erp.chat.service.RagService;
import io.qdrant.client.QdrantClient;
import io.qdrant.client.grpc.Collections.Distance;
import io.qdrant.client.grpc.Collections.PayloadSchemaType;
import io.qdrant.client.grpc.Collections.VectorParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * Garante, na subida, que a coleção do RAG exista no Qdrant — SEM depender da OpenAI.
 *
 * <p>O {@code initialize-schema=true} do Spring AI chama a API de embeddings no boot só para
 * descobrir a dimensão do vetor: com a chave da OpenAI inválida/inalcançável e a coleção ainda
 * inexistente, o backend não subia. Aqui a dimensão vem da configuração
 * ({@code rag.dimensao-embedding}, 1536 = {@code text-embedding-3-small}) e a distância é Cosine
 * (a mesma que o Spring AI usaria).
 *
 * <p>Também cria o índice de payload {@code keyword} em {@code empresaId}: TODA recuperação filtra
 * por esse campo (isolamento por empresa — ver {@link RagService}); sem índice o Qdrant varre o
 * payload de todos os pontos. A criação do índice é idempotente.
 *
 * <p><b>Tolerante a falhas:</b> o RAG é complementar. Qualquer erro (Qdrant fora, API key errada)
 * gera WARN e a aplicação segue de pé; a recuperação já é resiliente a coleção ausente.
 */
@Component
public class QdrantColecaoInicializador implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(QdrantColecaoInicializador.class);

    /** Campo de metadado usado no filtro de isolamento por empresa. */
    static final String CAMPO_EMPRESA = "empresaId";
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final ObjectProvider<QdrantClient> clientProvider;
    private final ObjectProvider<RagService> ragServiceProvider;
    private final String colecao;
    private final int dimensao;

    public QdrantColecaoInicializador(ObjectProvider<QdrantClient> clientProvider,
                                      ObjectProvider<RagService> ragServiceProvider,
                                      @Value("${spring.ai.vectorstore.qdrant.collection-name:core4erp_rag}") String colecao,
                                      @Value("${rag.dimensao-embedding:1536}") int dimensao) {
        this.clientProvider = clientProvider;
        this.ragServiceProvider = ragServiceProvider;
        this.colecao = colecao;
        this.dimensao = dimensao;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (garantirColecao()) {
            // A coleção pode ter acabado de nascer: reavalia se está vazia (evita embedding à toa).
            RagService rag = ragServiceProvider.getIfAvailable();
            if (rag != null) rag.reavaliarColecao();
        }
    }

    /** Cria a coleção (se faltar) e o índice de {@code empresaId}. Nunca lança: devolve se deu certo. */
    boolean garantirColecao() {
        QdrantClient client = clientProvider.getIfAvailable();
        if (client == null) {
            log.warn("[RAG] cliente do Qdrant indisponível — coleção '{}' não verificada", colecao);
            return false;
        }
        try {
            boolean existe = Boolean.TRUE.equals(
                    client.collectionExistsAsync(colecao, TIMEOUT).get(TIMEOUT.toSeconds(), TimeUnit.SECONDS));
            if (!existe) {
                VectorParams params = VectorParams.newBuilder()
                        .setSize(dimensao)
                        .setDistance(Distance.Cosine)
                        .build();
                client.createCollectionAsync(colecao, params, TIMEOUT).get(TIMEOUT.toSeconds(), TimeUnit.SECONDS);
                log.info("[RAG] coleção '{}' criada no Qdrant (dimensão={}, distância=Cosine)", colecao, dimensao);
            }
            client.createPayloadIndexAsync(colecao, CAMPO_EMPRESA, PayloadSchemaType.Keyword,
                    null, true, null, TIMEOUT).get(TIMEOUT.toSeconds(), TimeUnit.SECONDS);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            log.warn("[RAG] verificação da coleção '{}' interrompida — seguindo sem RAG garantido", colecao);
            return false;
        } catch (Exception e) {
            log.warn("[RAG] não foi possível preparar a coleção '{}' no Qdrant (a aplicação segue; o chat "
                    + "funciona sem RAG): {}", colecao, e.getMessage());
            return false;
        }
    }
}
