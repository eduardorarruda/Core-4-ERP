package br.com.core4erp.chat.integracao;

import io.qdrant.client.QdrantClient;
import io.qdrant.client.QdrantGrpcClient;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.qdrant.QdrantVectorStore;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/**
 * Verificação de compatibilidade do qdrant-client com o io.grpc fixado no build.gradle (CVE-2025-55163).
 * Opt-in: só roda com QDRANT_IT_PORT definido, apontando para um Qdrant de teste, ex.:
 * <pre>
 *   docker run -d --rm -p 16333:6333 -p 16334:6334 qdrant/qdrant:v1.18.2
 *   QDRANT_IT_PORT=16334 ./gradlew test --tests '*QdrantGrpcIntegracaoTest'
 * </pre>
 */
@EnabledIfEnvironmentVariable(named = "QDRANT_IT_PORT", matches = "\\d+")
class QdrantGrpcIntegracaoTest {

    private static final int DIMENSAO = 8;

    /** Embedding determinístico (sem OpenAI): vetor derivado dos bytes do texto. */
    static class EmbeddingFalso implements EmbeddingModel {
        @Override
        public EmbeddingResponse call(EmbeddingRequest request) {
            List<Embedding> lista = new ArrayList<>();
            for (int i = 0; i < request.getInstructions().size(); i++) {
                lista.add(new Embedding(vetor(request.getInstructions().get(i)), i));
            }
            return new EmbeddingResponse(lista);
        }

        @Override
        public float[] embed(Document document) {
            return vetor(document.getText());
        }

        @Override
        public int dimensions() {
            return DIMENSAO;
        }

        static float[] vetor(String texto) {
            float[] v = new float[DIMENSAO];
            byte[] b = texto.getBytes(StandardCharsets.UTF_8);
            for (int i = 0; i < b.length; i++) v[i % DIMENSAO] += b[i];
            return v;
        }
    }

    @Test
    void vectorStore_adicionaEBuscaComFiltroViaGrpc() throws Exception {
        int porta = Integer.parseInt(System.getenv("QDRANT_IT_PORT"));
        try (QdrantClient client = new QdrantClient(
                QdrantGrpcClient.newBuilder("localhost", porta, false).build())) {
            QdrantVectorStore store = QdrantVectorStore.builder(client, new EmbeddingFalso())
                    .collectionName("it_grpc_" + UUID.randomUUID().toString().substring(0, 8))
                    .initializeSchema(true)
                    .build();
            store.afterPropertiesSet();

            store.add(List.of(
                    new Document("aluguel do escritório", Map.of("empresaId", "1")),
                    new Document("aluguel do escritório", Map.of("empresaId", "2"))));

            List<Document> docs = store.similaritySearch(SearchRequest.builder()
                    .query("aluguel do escritório").topK(5)
                    .filterExpression("empresaId == '1'").build());

            assertFalse(docs.isEmpty());
            docs.forEach(d -> assertEquals("1", d.getMetadata().get("empresaId")));
        }
    }
}
