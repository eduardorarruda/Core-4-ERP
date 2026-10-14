package br.com.core4erp.chat.service;

import br.com.core4erp.chat.config.ChatToolErrorConfigTestAccess;
import br.com.core4erp.chat.tools.cadastro.CadastroTools;
import br.com.core4erp.chat.tools.consulta.ConsultaTools;
import br.com.core4erp.chat.tools.gestao.GestaoFinanceiraTools;
import br.com.core4erp.chat.tools.lancamento.LancamentoTools;
import br.com.core4erp.chat.tools.relatorio.RelatorioTools;
import br.com.core4erp.chat.tools.teste.FerramentasFalsas;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.support.ToolCallbacks;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.execution.ToolExecutionException;
import org.springframework.aop.aspectj.annotation.AspectJProxyFactory;

import java.lang.reflect.Method;
import java.time.Duration;
import java.util.Arrays;
import java.util.Set;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Valida o portão de ações críticas ponta a ponta: proxy AOP real (gate de ação crítica + gate de
 * anexo, na mesma ordem do contexto Spring) + ToolCallbacks do Spring AI (o caminho do ChatClient).
 */
class GateAcaoCriticaAspectTest {

    private static final Long CONVERSA = 10L;
    private static final Long USUARIO = 7L;
    private static final String EXCLUIR_5 = "{\"id\":5}";

    private final AtomicLong relogioNanos = new AtomicLong();
    private final AcoesCriticasPendentes pendentes =
            new AcoesCriticasPendentes(Duration.ofMinutes(10), relogioNanos::get);
    private final FerramentasFalsas alvo = new FerramentasFalsas();
    private final Object proxy = criarProxy();

    private Object criarProxy() {
        AspectJProxyFactory factory = new AspectJProxyFactory(alvo);
        factory.setProxyTargetClass(true);
        factory.addAspect(new GateAcaoCriticaAspect(pendentes)); // @Order(1): roda antes
        factory.addAspect(new GateEscritaAnexoAspect());
        return factory.getProxy();
    }

    private ToolCallback callback(String nome) {
        return Arrays.stream(ToolCallbacks.from(proxy))
                .filter(c -> c.getToolDefinition().name().equals(nome))
                .findFirst().orElseThrow();
    }

    /** Simula o ChatService recebendo uma nova mensagem do usuário (novo turno). */
    private void novoTurno(Long conversa, Long usuario, String mensagemUsuario) {
        TurnoChatHolder.definir(pendentes.iniciarTurno(conversa, usuario,
                ConfirmacaoUsuario.isConfirmacaoExplicita(mensagemUsuario)));
    }

    private void novoTurno(String mensagemUsuario) {
        novoTurno(CONVERSA, USUARIO, mensagemUsuario);
    }

    private String bloqueada(String ferramenta, String json) {
        ToolExecutionException e = assertThrows(ToolExecutionException.class,
                () -> callback(ferramenta).call(json));
        assertInstanceOf(ConfirmacaoNecessariaException.class, e.getCause());
        return ChatToolErrorConfigTestAccess.processar(e);
    }

    @AfterEach
    void limpar() {
        TurnoChatHolder.limpar();
        TurnoAnexoHolder.limpar();
    }

    @Test
    void primeiraChamada_naoExecutaRegistraPendenciaEDevolveResumo() {
        novoTurno("exclua o registro 5");
        String paraModelo = bloqueada("excluirRegistro", EXCLUIR_5);

        assertEquals(0, alvo.acoesCriticas.get(), "a ação crítica NÃO pode ter executado");
        assertTrue(paraModelo.startsWith("CONFIRMAÇÃO NECESSÁRIA"));
        assertTrue(paraModelo.contains("Excluir o registro (id=5)"), paraModelo);
        assertTrue(paraModelo.contains("Posso prosseguir?"));
        assertTrue(paraModelo.contains("EXATAMENTE os mesmos argumentos"));
    }

    @Test
    void mesmoTurno_repetirChamadaContinuaBloqueado() {
        novoTurno("sim, exclua o registro 5"); // até com "sim": a pendência precisa ser de turno ANTERIOR
        bloqueada("excluirRegistro", EXCLUIR_5);
        String repetida = bloqueada("excluirRegistro", EXCLUIR_5);

        assertEquals(0, alvo.acoesCriticas.get());
        assertTrue(repetida.contains("NÃO repita a chamada"));
    }

    @Test
    void proximoTurnoComSim_executaUmaUnicaVez() {
        novoTurno("exclua o registro 5");
        bloqueada("excluirRegistro", EXCLUIR_5);

        novoTurno("Sim, pode excluir!");
        assertEquals("\"excluido 5\"", callback("excluirRegistro").call(EXCLUIR_5));
        assertEquals(1, alvo.acoesCriticas.get());

        // Uso único: a 2ª chamada no mesmo turno vira nova pendência (não executa de novo).
        bloqueada("excluirRegistro", EXCLUIR_5);
        assertEquals(1, alvo.acoesCriticas.get());
    }

    @Test
    void argumentosEquivalentes_sãoCanonizados() {
        novoTurno("transfira 150 para o Itaú");
        bloqueada("transferir", "{\"destino\":\"Itaú\",\"valor\":150}");

        novoTurno("confirmo");
        callback("transferir").call("{\"destino\":\" itaú \",\"valor\":150.00}");
        assertEquals(1, alvo.acoesCriticas.get());
    }

    @Test
    void proximoTurnoComNao_bloqueado() {
        novoTurno("exclua o registro 5");
        bloqueada("excluirRegistro", EXCLUIR_5);

        novoTurno("não, sim, espera");
        bloqueada("excluirRegistro", EXCLUIR_5);
        assertEquals(0, alvo.acoesCriticas.get());
    }

    @Test
    void proximoTurnoComArgumentosDiferentes_bloqueado() {
        novoTurno("exclua o registro 5");
        bloqueada("excluirRegistro", EXCLUIR_5);

        novoTurno("sim");
        bloqueada("excluirRegistro", "{\"id\":6}");
        bloqueada("transferir", "{\"destino\":\"Itaú\",\"valor\":5}");
        assertEquals(0, alvo.acoesCriticas.get());
    }

    @Test
    void pendenciaDeDoisTurnosAtras_bloqueada() {
        novoTurno("exclua o registro 5");
        bloqueada("excluirRegistro", EXCLUIR_5);
        novoTurno("qual o meu saldo");
        novoTurno("sim");

        bloqueada("excluirRegistro", EXCLUIR_5);
        assertEquals(0, alvo.acoesCriticas.get());
    }

    @Test
    void ttlExpirado_bloqueado() {
        novoTurno("exclua o registro 5");
        bloqueada("excluirRegistro", EXCLUIR_5);

        relogioNanos.addAndGet(Duration.ofMinutes(11).toNanos());
        novoTurno("sim");
        bloqueada("excluirRegistro", EXCLUIR_5);
        assertEquals(0, alvo.acoesCriticas.get());
    }

    @Test
    void outroUsuarioOuOutraConversa_bloqueado() {
        novoTurno("exclua o registro 5");
        bloqueada("excluirRegistro", EXCLUIR_5);

        novoTurno(CONVERSA, 99L, "sim");          // outro usuário, mesma conversa
        bloqueada("excluirRegistro", EXCLUIR_5);
        novoTurno(77L, USUARIO, "sim");           // mesmo usuário, outra conversa
        bloqueada("excluirRegistro", EXCLUIR_5);

        assertEquals(0, alvo.acoesCriticas.get());
    }

    @Test
    void semTurnoDoChat_ex_mcp_sempreBloqueado() {
        String paraModelo = bloqueada("excluirRegistro", EXCLUIR_5);
        assertTrue(paraModelo.contains("só podem ser executadas pelo chat"));
        assertEquals(0, alvo.acoesCriticas.get());
    }

    @Test
    void ferramentasNaoCriticas_naoSaoAfetadas() {
        novoTurno("cadastre o parceiro ACME");
        assertTrue(callback("registrarParceiro").call("{\"nome\":\"ACME\"}").contains("criado ACME"));
        assertTrue(callback("consultarSaldo").call("{}").contains("saldo=100"));
        assertEquals(1, alvo.escritas.get());

        TurnoChatHolder.limpar(); // fora de turno (MCP): só a ação crítica é bloqueada
        assertTrue(callback("registrarParceiro").call("{\"nome\":\"B\"}").contains("criado B"));
    }

    @Test
    void turnoComAnexo_gatesFuncionamJuntos() {
        // Turno com anexo: escrita comum barrada pelo gate de anexo; ação crítica registrada pelo gate crítico.
        TurnoAnexoHolder.marcar();
        TurnoChatHolder.definir(pendentes.iniciarTurno(CONVERSA, USUARIO, false));
        String escrita = bloqueada("registrarParceiro", "{\"nome\":\"ACME\"}");
        assertTrue(escrita.contains("arquivo anexado"));
        bloqueada("excluirRegistro", EXCLUIR_5);
        assertTrue(callback("consultarSaldo").call("{}").contains("saldo=100"));
        TurnoAnexoHolder.limpar();

        // Turno seguinte (sem anexo) com "sim": escrita comum e a ação crítica confirmada executam.
        novoTurno("sim");
        callback("registrarParceiro").call("{\"nome\":\"ACME\"}");
        callback("excluirRegistro").call(EXCLUIR_5);
        assertEquals(1, alvo.escritas.get());
        assertEquals(1, alvo.acoesCriticas.get());
    }

    // ── Fail-safe da classificação: a lista de ações críticas é explícita e travada aqui ───────────

    private static final Set<String> ACOES_CRITICAS_ESPERADAS = Set.of(
            "excluirConta", "estornarConta", "baixarConta", "transferirEntreContas",
            "registrarTransacaoInvestimento", "fecharFatura",
            "excluirContaCorrente", "excluirCartaoCredito", "excluirLancamentoCartao", "excluirAssinatura",
            "excluirCategoria", "excluirParceiro", "excluirInvestimento");

    private static Stream<Method> ferramentasReais() {
        return Stream.of(ConsultaTools.class, LancamentoTools.class, RelatorioTools.class,
                        CadastroTools.class, GestaoFinanceiraTools.class)
                .flatMap(c -> Arrays.stream(c.getDeclaredMethods()))
                .filter(m -> m.isAnnotationPresent(Tool.class));
    }

    @Test
    void listaDeAcoesCriticasEhExatamenteAEsperada() {
        Set<String> anotadas = ferramentasReais()
                .filter(m -> m.isAnnotationPresent(AcaoCritica.class))
                .map(Method::getName)
                .collect(Collectors.toSet());
        assertEquals(ACOES_CRITICAS_ESPERADAS, anotadas);
    }

    @Test
    void todaFerramentaDestrutivaOuFinanceiraEstaAnotada() {
        // Rede de segurança para ferramentas NOVAS: verbos destrutivos/financeiros exigem @AcaoCritica.
        ferramentasReais()
                .filter(m -> m.getName().matches(
                        "^(excluir|deletar|remover|estornar|baixar|pagar|transferir|fechar|resgatar|aportar).*"))
                .forEach(m -> assertNotNull(m.getAnnotation(AcaoCritica.class),
                        m.getName() + " é destrutiva/financeira e precisa de @AcaoCritica"));
    }
}
