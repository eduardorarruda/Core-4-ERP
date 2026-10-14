package br.com.core4erp.chat.config;

import br.com.core4erp.chat.service.TurnoChatHolder;
import io.micrometer.context.ContextSnapshot;
import io.micrometer.context.ContextSnapshotFactory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

/** O turno do chat precisa chegar às threads onde o Spring AI executa as tools (streaming/Reactor). */
class ChatAiConfigPropagacaoTest {

    @AfterEach
    void limpar() {
        TurnoChatHolder.limpar();
    }

    @Test
    void turnoDoChatEhPropagadoParaOutraThread() throws Exception {
        new ChatAiConfig().registrarPropagacaoDeContexto();
        TurnoChatHolder.Turno turno = new TurnoChatHolder.Turno(1L, 2L, 3L, true);
        TurnoChatHolder.definir(turno);

        ContextSnapshot snapshot = ContextSnapshotFactory.builder().build().captureAll();
        AtomicReference<TurnoChatHolder.Turno> visto = new AtomicReference<>();
        AtomicReference<TurnoChatHolder.Turno> semSnapshot = new AtomicReference<>();
        CompletableFuture.runAsync(snapshot.wrap(() -> visto.set(TurnoChatHolder.atual()))).get();
        CompletableFuture.runAsync(() -> semSnapshot.set(TurnoChatHolder.atual())).get();

        assertEquals(turno, visto.get());
        assertNull(semSnapshot.get());
    }
}
