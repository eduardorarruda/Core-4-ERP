package br.com.core4erp.chat.service;

import br.com.core4erp.chat.dto.ChatRequestDto;
import br.com.core4erp.chat.dto.ChatResponseDto;
import br.com.core4erp.chat.metrics.ChatMetrics;
import br.com.core4erp.chat.tools.consulta.ConsultaTools;
import br.com.core4erp.chat.tools.lancamento.LancamentoTools;
import br.com.core4erp.chat.tools.relatorio.RelatorioTools;
import br.com.core4erp.config.security.SecurityContextUtils;
import io.micrometer.core.instrument.Timer;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
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

    private static final Pattern DOWNLOAD_URL_PATTERN =
            Pattern.compile("/api/chat/relatorios/[^\\s\"'<>]+\\.xlsx");

    private final Cache<String, List<Message>> memoriaConversas = Caffeine.newBuilder()
            .expireAfterAccess(2, TimeUnit.HOURS)
            .maximumSize(1000)
            .build();

    private static final int MAX_HISTORICO = 20;

    public ChatService(ChatClient.Builder chatClientBuilder,
                       SystemPromptBuilder promptBuilder,
                       SecurityContextUtils securityCtx,
                       ChatInputSanitizer sanitizer,
                       ConsultaTools consultaTools,
                       LancamentoTools lancamentoTools,
                       RelatorioTools relatorioTools,
                       ChatMetrics chatMetrics) {
        this.chatClient = chatClientBuilder.build();
        this.promptBuilder = promptBuilder;
        this.securityCtx = securityCtx;
        this.sanitizer = sanitizer;
        this.consultaTools = consultaTools;
        this.lancamentoTools = lancamentoTools;
        this.relatorioTools = relatorioTools;
        this.chatMetrics = chatMetrics;
    }

    public ChatResponseDto processar(ChatRequestDto request) {
        chatMetrics.registrarMensagem();
        Timer.Sample timer = chatMetrics.iniciarTimer();

        String email = securityCtx.getEmail();
        String systemPrompt = promptBuilder.build(securityCtx.getUsuario());

        List<Message> historico = memoriaConversas.get(email, k -> new ArrayList<>());

        historico.add(new UserMessage(sanitizer.sanitize(request.mensagem())));

        // SystemMessage primeiro, depois o histórico completo
        List<Message> allMessages = new ArrayList<>();
        allMessages.add(new SystemMessage(systemPrompt));
        allMessages.addAll(historico);

        try {
            ChatResponse response = chatClient.prompt()
                    .messages(allMessages)
                    .tools(consultaTools, lancamentoTools, relatorioTools)
                    .call()
                    .chatResponse();

            String respostaTexto = (response.getResult() != null && response.getResult().getOutput() != null)
                    ? response.getResult().getOutput().getText()
                    : "";

            log.info("[CHAT-USAGE] user={} usage={}", email, response.getMetadata().getUsage());

            historico.add(new AssistantMessage(respostaTexto));
            podarHistorico(historico);

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

        // Capture security context on the servlet thread before async hand-off
        String email = securityCtx.getEmail();
        String systemPrompt = promptBuilder.build(securityCtx.getUsuario());

        List<Message> historico = memoriaConversas.get(email, k -> new ArrayList<>());
        historico.add(new UserMessage(sanitizer.sanitize(request.mensagem())));

        List<Message> allMessages = new ArrayList<>();
        allMessages.add(new SystemMessage(systemPrompt));
        allMessages.addAll(historico);

        StringBuilder fullResponse = new StringBuilder();

        chatClient.prompt()
                .messages(allMessages)
                .tools(consultaTools, lancamentoTools, relatorioTools)
                .stream()
                .content()
                .doOnNext(token -> {
                    try {
                        fullResponse.append(token);
                        emitter.send(SseEmitter.event().data(token));
                    } catch (IOException e) {
                        emitter.completeWithError(e);
                    }
                })
                .doOnComplete(() -> {
                    historico.add(new AssistantMessage(fullResponse.toString()));
                    podarHistorico(historico);
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
        memoriaConversas.invalidate(securityCtx.getEmail());
    }

    private void podarHistorico(List<Message> historico) {
        while (historico.size() > MAX_HISTORICO) {
            historico.remove(0);
        }
    }

    private String extrairDownloadUrl(String resposta) {
        if (resposta == null) return null;
        Matcher m = DOWNLOAD_URL_PATTERN.matcher(resposta);
        return m.find() ? m.group() : null;
    }
}
