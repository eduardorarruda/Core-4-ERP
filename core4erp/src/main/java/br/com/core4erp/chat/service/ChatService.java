package br.com.core4erp.chat.service;

import br.com.core4erp.chat.dto.ChatRequestDto;
import br.com.core4erp.chat.dto.ChatResponseDto;
import br.com.core4erp.chat.entity.ChatMensagem;
import br.com.core4erp.chat.metrics.ChatMetrics;
import br.com.core4erp.chat.tools.consulta.ConsultaTools;
import br.com.core4erp.chat.tools.lancamento.LancamentoTools;
import br.com.core4erp.chat.tools.relatorio.RelatorioTools;
import br.com.core4erp.config.security.SecurityContextUtils;
import io.micrometer.core.instrument.Timer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.metadata.Usage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final ChatClient chatClient;
    private final SystemPromptBuilder promptBuilder;
    private final SecurityContextUtils securityCtx;
    private final ChatInputSanitizer sanitizer;
    private final ConsultaTools consultaTools;
    private final LancamentoTools lancamentoTools;
    private final RelatorioTools relatorioTools;
    private final ChatMetrics chatMetrics;
    private final ChatMemoryService memoryService;
    private final int maxHistorico;

    private static final Pattern DOWNLOAD_URL_PATTERN =
            Pattern.compile("/api/chat/relatorios/[^\\s\"'<>]+\\.xlsx");

    public ChatService(ChatClient.Builder chatClientBuilder,
                       SystemPromptBuilder promptBuilder,
                       SecurityContextUtils securityCtx,
                       ChatInputSanitizer sanitizer,
                       ConsultaTools consultaTools,
                       LancamentoTools lancamentoTools,
                       RelatorioTools relatorioTools,
                       ChatMetrics chatMetrics,
                       ChatMemoryService memoryService,
                       @Value("${chat.historico.max-mensagens:20}") int maxHistorico) {
        this.chatClient = chatClientBuilder.build();
        this.promptBuilder = promptBuilder;
        this.securityCtx = securityCtx;
        this.sanitizer = sanitizer;
        this.consultaTools = consultaTools;
        this.lancamentoTools = lancamentoTools;
        this.relatorioTools = relatorioTools;
        this.chatMetrics = chatMetrics;
        this.memoryService = memoryService;
        this.maxHistorico = maxHistorico;
    }

    public ChatResponseDto processar(ChatRequestDto request) {
        chatMetrics.registrarMensagem();
        Timer.Sample timer = chatMetrics.iniciarTimer();

        String email = securityCtx.getEmail();
        Long usuarioId = securityCtx.getUsuarioId();
        String systemPrompt = promptBuilder.build(securityCtx.getUsuario());
        String mensagemUsuario = sanitizer.sanitize(request.mensagem());

        List<Message> allMessages = montarMensagens(usuarioId, systemPrompt, mensagemUsuario);
        memoryService.registrar(usuarioId, ChatMensagem.Role.USER, mensagemUsuario);

        try {
            ChatResponse response = chatClient.prompt()
                    .messages(allMessages)
                    .tools(consultaTools, lancamentoTools, relatorioTools)
                    .call()
                    .chatResponse();

            String respostaTexto = (response.getResult() != null && response.getResult().getOutput() != null)
                    ? response.getResult().getOutput().getText()
                    : "";

            registrarUsage(response, email);
            memoryService.registrar(usuarioId, ChatMensagem.Role.ASSISTANT, respostaTexto);

            String downloadUrl = extrairDownloadUrl(respostaTexto);
            return new ChatResponseDto(respostaTexto, downloadUrl, List.of());
        } catch (Exception e) {
            chatMetrics.registrarErro();
            throw e;
        } finally {
            chatMetrics.finalizarTimer(timer);
        }
    }

    public void processarStream(ChatRequestDto request, SseEmitter emitter) {
        chatMetrics.registrarMensagem();
        chatMetrics.incrementarSessoes();

        // Captura a identidade na thread da requisição antes do hand-off assíncrono.
        // (O contexto de segurança é propagado às threads do Reactor por
        // ReactorContextPropagationConfig, mas usamos o usuarioId explícito na persistência.)
        String email = securityCtx.getEmail();
        Long usuarioId = securityCtx.getUsuarioId();
        String systemPrompt = promptBuilder.build(securityCtx.getUsuario());
        String mensagemUsuario = sanitizer.sanitize(request.mensagem());

        List<Message> allMessages = montarMensagens(usuarioId, systemPrompt, mensagemUsuario);
        memoryService.registrar(usuarioId, ChatMensagem.Role.USER, mensagemUsuario);

        StringBuilder fullResponse = new StringBuilder();
        AtomicReference<ChatResponse> ultimaResposta = new AtomicReference<>();

        chatClient.prompt()
                .messages(allMessages)
                .tools(consultaTools, lancamentoTools, relatorioTools)
                .stream()
                .chatResponse()
                .doOnNext(resp -> {
                    ultimaResposta.set(resp);
                    String token = extrairTexto(resp);
                    if (token != null && !token.isEmpty()) {
                        try {
                            fullResponse.append(token);
                            emitter.send(SseEmitter.event().data(token));
                        } catch (IOException e) {
                            emitter.completeWithError(e);
                        }
                    }
                })
                .doOnComplete(() -> {
                    registrarUsage(ultimaResposta.get(), email);
                    memoryService.registrar(usuarioId, ChatMensagem.Role.ASSISTANT, fullResponse.toString());
                    chatMetrics.decrementarSessoes();
                    emitter.complete();
                })
                .doOnError(err -> {
                    chatMetrics.registrarErro();
                    chatMetrics.decrementarSessoes();
                    emitter.completeWithError(err);
                })
                .subscribe();
    }

    public void limparHistorico() {
        memoryService.limpar(securityCtx.getUsuarioId());
    }

    private List<Message> montarMensagens(Long usuarioId, String systemPrompt, String mensagemUsuario) {
        List<Message> historico = memoryService.carregar(usuarioId, maxHistorico);
        List<Message> allMessages = new ArrayList<>(historico.size() + 2);
        allMessages.add(new SystemMessage(systemPrompt));
        allMessages.addAll(historico);
        allMessages.add(new UserMessage(mensagemUsuario));
        return allMessages;
    }

    private String extrairTexto(ChatResponse resp) {
        if (resp == null || resp.getResult() == null || resp.getResult().getOutput() == null) {
            return null;
        }
        return resp.getResult().getOutput().getText();
    }

    private void registrarUsage(ChatResponse response, String email) {
        if (response == null || response.getMetadata() == null) {
            return;
        }
        Usage usage = response.getMetadata().getUsage();
        if (usage == null) {
            return;
        }
        long prompt = usage.getPromptTokens() != null ? usage.getPromptTokens().longValue() : 0L;
        long completion = usage.getCompletionTokens() != null ? usage.getCompletionTokens().longValue() : 0L;
        chatMetrics.registrarTokens(prompt, completion);
        log.info("[CHAT-USAGE] user={} promptTokens={} completionTokens={}", email, prompt, completion);
    }

    private String extrairDownloadUrl(String resposta) {
        if (resposta == null) return null;
        Matcher m = DOWNLOAD_URL_PATTERN.matcher(resposta);
        return m.find() ? m.group() : null;
    }
}
