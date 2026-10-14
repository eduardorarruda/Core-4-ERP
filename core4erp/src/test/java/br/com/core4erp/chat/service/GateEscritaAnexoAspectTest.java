package br.com.core4erp.chat.service;

import br.com.core4erp.chat.config.ChatToolErrorConfigTestAccess;
import br.com.core4erp.chat.tools.teste.FerramentasFalsas;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.execution.ToolExecutionException;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;

import java.util.Arrays;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Valida o portão técnico ponta a ponta: proxy AOP real + ToolCallbacks do Spring AI (o mesmo
 * caminho usado pelo ChatClient) — escrita bloqueada só em turno com anexo.
 */
class GateEscritaAnexoAspectTest {

    private final FerramentasFalsas alvo = new FerramentasFalsas();

    private ToolCallback callback(String nome) {
        AspectJProxyFactory factory = new AspectJProxyFactory(alvo);
        factory.setProxyTargetClass(true);
        factory.addAspect(new GateEscritaAnexoAspect());
        Object proxy = factory.getProxy();
        return Arrays.stream(ToolCallbacks.from(proxy))
                .filter(c -> c.getToolDefinition().name().equals(nome))
                .findFirst().orElseThrow();
    }

    @AfterEach
    void limpar() {
        TurnoAnexoHolder.limpar();
    }

    @Test
    void semAnexo_escritaExecutaNormalmente() {
        String r = callback("registrarParceiro").call("{\"nome\":\"ACME\"}");
        assertTrue(r.contains("criado ACME"));
        assertEquals(1, alvo.escritas.get());
    }

    @Test
    void comAnexo_escritaBloqueadaComConfirmacaoNecessaria() {
        TurnoAnexoHolder.marcar();
        ToolExecutionException e = assertThrows(ToolExecutionException.class,
                () -> callback("registrarParceiro").call("{\"nome\":\"ACME\"}"));
        assertInstanceOf(ConfirmacaoNecessariaException.class, e.getCause());
        assertEquals(0, alvo.escritas.get(), "a escrita NÃO pode ter executado");

        // O processor do chat devolve ao modelo a instrução de confirmação (sem tratar como falha).
        String paraModelo = ChatToolErrorConfigTestAccess.processar(e);
        assertTrue(paraModelo.startsWith("CONFIRMAÇÃO NECESSÁRIA"));
        assertTrue(paraModelo.contains("Posso prosseguir?"));
    }

    @Test
    void comAnexo_leituraContinuaLiberada() {
        TurnoAnexoHolder.marcar();
        assertTrue(callback("consultarSaldo").call("{}").contains("saldo=100"));
    }

    @Test
    void classificacao_failSafe_ferramentaDesconhecidaEhEscrita() {
        assertFalse(GateEscritaAnexoAspect.isEscrita("consultarContas"));
        assertFalse(GateEscritaAnexoAspect.isEscrita("gerarRelatorioExcel"));
        assertTrue(GateEscritaAnexoAspect.isEscrita("baixarConta"));
        assertTrue(GateEscritaAnexoAspect.isEscrita("transferirEntreContas"));
        assertTrue(GateEscritaAnexoAspect.isEscrita("novaFerramentaQualquer"));
        assertTrue(GateEscritaAnexoAspect.isEscrita(null));
    }
}
