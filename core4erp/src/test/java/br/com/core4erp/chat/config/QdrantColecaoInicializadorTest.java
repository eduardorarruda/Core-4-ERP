package br.com.core4erp.chat.config;

import br.com.core4erp.chat.service.RagService;
import com.google.common.util.concurrent.Futures;
import io.qdrant.client.QdrantClient;
import io.qdrant.client.grpc.Collections.CollectionOperationResponse;
import io.qdrant.client.grpc.Collections.Distance;
import io.qdrant.client.grpc.Collections.PayloadSchemaType;
import io.qdrant.client.grpc.Collections.VectorParams;
import io.qdrant.client.grpc.Points.UpdateResult;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class QdrantColecaoInicializadorTest {

    private static final String COLECAO = "core4erp_rag";

    private final QdrantClient client = mock(QdrantClient.class);
    private final RagService rag = mock(RagService.class);

    @SuppressWarnings("unchecked")
    private QdrantColecaoInicializador inicializador(QdrantClient c) {
        ObjectProvider<QdrantClient> clientProvider = mock(ObjectProvider.class);
        when(clientProvider.getIfAvailable()).thenReturn(c);
        ObjectProvider<RagService> ragProvider = mock(ObjectProvider.class);
        when(ragProvider.getIfAvailable()).thenReturn(rag);
        return new QdrantColecaoInicializador(clientProvider, ragProvider, COLECAO, 1536);
    }

    private void indiceOk() {
        when(client.createPayloadIndexAsync(anyString(), anyString(), any(), any(), any(), any(), any()))
                .thenReturn(Futures.immediateFuture(UpdateResult.getDefaultInstance()));
    }

    @Test
    void colecaoAusente_criaComDimensaoConfiguradaECosineEIndiceDeEmpresa() {
        when(client.collectionExistsAsync(eq(COLECAO), any(Duration.class))).thenReturn(Futures.immediateFuture(false));
        when(client.createCollectionAsync(eq(COLECAO), any(VectorParams.class), any(Duration.class)))
                .thenReturn(Futures.immediateFuture(CollectionOperationResponse.getDefaultInstance()));
        indiceOk();

        inicializador(client).run(null);

        ArgumentCaptor<VectorParams> params = ArgumentCaptor.forClass(VectorParams.class);
        verify(client).createCollectionAsync(eq(COLECAO), params.capture(), any(Duration.class));
        assertThat(params.getValue().getSize()).isEqualTo(1536);
        assertThat(params.getValue().getDistance()).isEqualTo(Distance.Cosine);
        verify(client).createPayloadIndexAsync(eq(COLECAO), eq("empresaId"), eq(PayloadSchemaType.Keyword),
                isNull(), eq(true), isNull(), any(Duration.class));
        verify(rag).reavaliarColecao();
    }

    @Test
    void colecaoExistente_naoRecriaMasGaranteIndice() {
        when(client.collectionExistsAsync(eq(COLECAO), any(Duration.class))).thenReturn(Futures.immediateFuture(true));
        indiceOk();

        assertThat(inicializador(client).garantirColecao()).isTrue();

        verify(client, never()).createCollectionAsync(anyString(), any(VectorParams.class), any(Duration.class));
        verify(client).createPayloadIndexAsync(eq(COLECAO), eq("empresaId"), eq(PayloadSchemaType.Keyword),
                isNull(), eq(true), isNull(), any(Duration.class));
    }

    @Test
    void qdrantFora_naoDerrubaASubida() {
        when(client.collectionExistsAsync(eq(COLECAO), any(Duration.class)))
                .thenReturn(Futures.immediateFailedFuture(new RuntimeException("UNAVAILABLE")));

        QdrantColecaoInicializador ini = inicializador(client);

        assertThatCode(() -> ini.run(null)).doesNotThrowAnyException();
        assertThat(ini.garantirColecao()).isFalse();
        verify(rag, never()).reavaliarColecao();
    }

    @Test
    void semClienteQdrant_apenasAvisa() {
        assertThat(inicializador(null).garantirColecao()).isFalse();
    }
}
