package br.com.core4erp.chat.service;

import br.com.core4erp.chat.dto.ChatHistoricoItemDto;
import br.com.core4erp.chat.dto.ChatRequestDto;
import br.com.core4erp.chat.entity.ChatConversa;
import br.com.core4erp.chat.entity.ChatMensagem;
import br.com.core4erp.chat.metrics.ChatMetrics;
import br.com.core4erp.chat.tools.cadastro.CadastroTools;
import br.com.core4erp.chat.tools.consulta.AnaliseFinanceiraTools;
import br.com.core4erp.chat.tools.consulta.ConsultaTools;
import br.com.core4erp.chat.tools.gestao.GestaoFinanceiraTools;
import br.com.core4erp.chat.tools.lancamento.LancamentoTools;
import br.com.core4erp.chat.tools.relatorio.RelatorioTools;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.usuario.entity.Usuario;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.retry.NonTransientAiException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import reactor.core.publisher.Flux;

import java.time.Duration;
import java.util.List;
import java.util.MissingFormatArgumentException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Falha da IA (OpenAI fora, 429, erro no stream, erro ao montar o prompt) não pode deixar a pergunta
 * sem resposta no histórico: o marcador {@link RespostaFalhaChat} é gravado como mensagem ASSISTANT,
 * nos dois caminhos (síncrono e streaming).
 */
class ChatServiceFalhaRespostaTest {

    private static final long USUARIO = 4L;
    private static final long CONVERSA = 30L;
    private static final ChatMensagem.Canal CANAL = ChatMensagem.Canal.ASSISTENTE;
    private static final long ESPERA_MS = 3_000L;

    private final ChatClient chatClient = mock(ChatClient.class, RETURNS_DEEP_STUBS);
    private final SystemPromptBuilder promptBuilder = mock(SystemPromptBuilder.class);
    private final SecurityContextUtils securityCtx = mock(SecurityContextUtils.class);
    private final ChatMemoryService memoryService = mock(ChatMemoryService.class);
    private final ChatConversaService conversaService = mock(ChatConversaService.class);
    private final RagService ragService = mock(RagService.class);
    private final TenantContext tenantCtx = mock(TenantContext.class);
    private final SseEmitter emitter = mock(SseEmitter.class);

    private ChatService service;

    @BeforeEach
    void setUp() {
        ChatClient.Builder builder = mock(ChatClient.Builder.class);
        when(builder.build()).thenReturn(chatClient);
        ChatConversa conversa = mock(ChatConversa.class);
        when(conversa.getId()).thenReturn(CONVERSA);
        when(conversaService.resolverOuCriar(any(), any())).thenReturn(conversa);
        when(securityCtx.getUsuarioId()).thenReturn(USUARIO);
        when(securityCtx.getUsuario()).thenReturn(new Usuario());
        when(promptBuilder.build(any(), anyBoolean())).thenReturn("system");
        when(ragService.recuperarContexto(anyString())).thenReturn("");
        when(memoryService.carregarContexto(any())).thenReturn(List.of());

        service = new ChatService(builder, promptBuilder, securityCtx, new ChatInputSanitizer(),
                mock(ConsultaTools.class), mock(AnaliseFinanceiraTools.class), mock(LancamentoTools.class),
                mock(RelatorioTools.class), mock(CadastroTools.class), mock(GestaoFinanceiraTools.class),
                new ChatMetrics(new SimpleMeterRegistry()), memoryService, conversaService, ragService,
                new ObjectMapper(), tenantCtx, mock(N8nChatOrquestradorService.class),
                new AcoesCriticasPendentes(10), "interno", 20, 0.15, 0.60);
    }

    // ── Síncrono ─────────────────────────────────────────────────────────────

    @Test
    void processar_falhaDaOpenAi_gravaMarcadorDeFalhaEPropagaErro() {
        when(chatClient.prompt().messages(any(List.class)).tools(any(Object[].class)).call().chatResponse())
                .thenThrow(new NonTransientAiException("401 - invalid_api_key"));

        assertThatThrownBy(() -> service.processar(new ChatRequestDto("quanto gastei 50% a mais?")))
                .isInstanceOf(NonTransientAiException.class);

        verify(memoryService).registrar(USUARIO, CONVERSA, CANAL, ChatMensagem.Role.USER, "quanto gastei 50% a mais?");
        verify(memoryService).registrar(USUARIO, CONVERSA, CANAL, ChatMensagem.Role.ASSISTANT,
                RespostaFalhaChat.TEXTO_PADRAO);
        verify(conversaService).aposMensagem(CONVERSA, "quanto gastei 50% a mais?");
    }

    @Test
    void processar_limiteDeRequisicoes_gravaTextoDeAguardar() {
        when(chatClient.prompt().messages(any(List.class)).tools(any(Object[].class)).call().chatResponse())
                .thenThrow(new NonTransientAiException("429 - rate_limit_exceeded"));

        assertThatThrownBy(() -> service.processar(new ChatRequestDto("oi")))
                .isInstanceOf(NonTransientAiException.class);

        verify(memoryService).registrar(USUARIO, CONVERSA, CANAL, ChatMensagem.Role.ASSISTANT,
                RespostaFalhaChat.TEXTO_LIMITE);
    }

    @Test
    void processar_falhaAoGravarMarcador_naoMascaraErroOriginal() {
        when(chatClient.prompt().messages(any(List.class)).tools(any(Object[].class)).call().chatResponse())
                .thenThrow(new NonTransientAiException("timeout"));
        org.mockito.Mockito.doThrow(new IllegalStateException("banco fora"))
                .when(memoryService).registrar(any(), any(), any(), eq(ChatMensagem.Role.ASSISTANT), anyString());

        assertThatThrownBy(() -> service.processar(new ChatRequestDto("oi")))
                .isInstanceOf(NonTransientAiException.class);
    }

    // ── Streaming ────────────────────────────────────────────────────────────

    @Test
    void processarStream_erroDoModelo_enviaTextoAmigavelEGravaMarcador() throws Exception {
        when(chatClient.prompt().messages(any(List.class)).tools(any(Object[].class)).stream().chatResponse())
                .thenReturn(Flux.error(new NonTransientAiException("401 Unauthorized")));

        service.processarStream(new ChatRequestDto("quanto gastei 50% a mais?"), emitter);

        verify(memoryService, timeout(ESPERA_MS)).registrar(USUARIO, CONVERSA, CANAL, ChatMensagem.Role.ASSISTANT,
                RespostaFalhaChat.TEXTO_PADRAO);
        verify(emitter, timeout(ESPERA_MS)).complete();
        verify(emitter, atLeastOnce()).send(any(SseEmitter.SseEventBuilder.class));
        verify(memoryService).registrar(USUARIO, CONVERSA, CANAL, ChatMensagem.Role.USER, "quanto gastei 50% a mais?");
    }

    @Test
    void processarStream_erroNoMeioDaResposta_gravaParcialComAvisoDeInterrupcao() {
        ChatResponse parcial = new ChatResponse(List.of(new Generation(new AssistantMessage("Você gastou "))));
        when(chatClient.prompt().messages(any(List.class)).tools(any(Object[].class)).stream().chatResponse())
                // O erro chega depois do 1º delta (o toStream do Reactor descarta itens pendentes se o
                // erro já estiver sinalizado quando o consumidor itera).
                .thenReturn(Flux.concat(Flux.just(parcial),
                        Flux.<ChatResponse>error(new RuntimeException("stream caiu"))
                                .delaySubscription(Duration.ofMillis(300))));

        service.processarStream(new ChatRequestDto("quanto gastei?"), emitter);

        ArgumentCaptor<String> conteudo = ArgumentCaptor.forClass(String.class);
        verify(memoryService, timeout(ESPERA_MS)).registrar(eq(USUARIO), eq(CONVERSA), eq(CANAL),
                eq(ChatMensagem.Role.ASSISTANT), conteudo.capture());
        assertThat(conteudo.getValue()).isEqualTo("Você gastou " + ChatService.AVISO_RESPOSTA_INTERROMPIDA);
        assertThat(RespostaFalhaChat.ehMarcador(conteudo.getValue())).isFalse();
    }

    @Test
    void processarStream_erroDeFormatoAoMontarPrompt_naoPropagaEGravaMarcador() throws Exception {
        // Regressão do 400 "Format specifier '% e'": qualquer falha ao montar o prompt vira resposta
        // amigável no stream — nunca uma exceção que o GlobalExceptionHandler transformaria em 4xx.
        when(promptBuilder.build(any(), anyBoolean())).thenThrow(new MissingFormatArgumentException("% e"));

        service.processarStream(new ChatRequestDto("subiu 50% e caiu"), emitter);

        verify(memoryService).registrar(USUARIO, CONVERSA, CANAL, ChatMensagem.Role.USER, "subiu 50% e caiu");
        verify(memoryService).registrar(USUARIO, CONVERSA, CANAL, ChatMensagem.Role.ASSISTANT,
                RespostaFalhaChat.TEXTO_PADRAO);
        verify(emitter).send(any(SseEmitter.SseEventBuilder.class));
        verify(emitter).complete();
        verify(chatClient, never()).prompt();
    }

    // ── Histórico ────────────────────────────────────────────────────────────

    @Test
    void mensagensDaConversa_marcaFalhaSoNoMarcadorDoAssistente() {
        when(memoryService.mensagensDaConversa(CONVERSA)).thenReturn(List.of(
                new ChatMensagem(USUARIO, CONVERSA, CANAL, ChatMensagem.Role.USER, RespostaFalhaChat.TEXTO_PADRAO),
                new ChatMensagem(USUARIO, CONVERSA, CANAL, ChatMensagem.Role.ASSISTANT, RespostaFalhaChat.TEXTO_PADRAO),
                new ChatMensagem(USUARIO, CONVERSA, CANAL, ChatMensagem.Role.ASSISTANT, "Seu saldo é **R$ 10,00**.")));
        when(conversaService.owned(CONVERSA)).thenReturn(mock(ChatConversa.class));

        List<ChatHistoricoItemDto> itens = service.mensagensDaConversa(CONVERSA);

        assertThat(itens).extracting(ChatHistoricoItemDto::falha).containsExactly(false, true, false);
        assertThat(itens.get(1).role()).isEqualTo("assistant");
        assertThat(Optional.ofNullable(itens.get(1).texto())).contains(RespostaFalhaChat.TEXTO_PADRAO);
    }
}
