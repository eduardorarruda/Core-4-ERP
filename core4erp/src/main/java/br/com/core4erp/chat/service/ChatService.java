package br.com.core4erp.chat.service;

import br.com.core4erp.chat.dto.ChatRequestDto;
import br.com.core4erp.chat.dto.ChatResponseDto;
import br.com.core4erp.chat.tools.consulta.ConsultaTools;
import br.com.core4erp.chat.tools.lancamento.LancamentoTools;
import br.com.core4erp.chat.tools.relatorio.RelatorioTools;
import br.com.core4erp.config.security.SecurityContextUtils;
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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

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

    // Memória in-memory por email do usuário.
    // Em produção, substituir por Redis com TTL.
    private final Map<String, List<Message>> memoriaConversas = new ConcurrentHashMap<>();

    private static final int MAX_HISTORICO = 20;

    public ChatService(ChatClient.Builder chatClientBuilder,
                       SystemPromptBuilder promptBuilder,
                       SecurityContextUtils securityCtx,
                       ChatInputSanitizer sanitizer,
                       ConsultaTools consultaTools,
                       LancamentoTools lancamentoTools,
                       RelatorioTools relatorioTools) {
        this.chatClient = chatClientBuilder.build();
        this.promptBuilder = promptBuilder;
        this.securityCtx = securityCtx;
        this.sanitizer = sanitizer;
        this.consultaTools = consultaTools;
        this.lancamentoTools = lancamentoTools;
        this.relatorioTools = relatorioTools;
    }

    public ChatResponseDto processar(ChatRequestDto request) {
        String email = securityCtx.getEmail();
        String systemPrompt = promptBuilder.build(securityCtx.getUsuario());

        List<Message> historico = memoriaConversas
                .computeIfAbsent(email, k -> new ArrayList<>());

        historico.add(new UserMessage(sanitizer.sanitize(request.mensagem())));

        // SystemMessage primeiro, depois o histórico completo
        List<Message> allMessages = new ArrayList<>();
        allMessages.add(new SystemMessage(systemPrompt));
        allMessages.addAll(historico);

        ChatResponse response = chatClient.prompt()
                .messages(allMessages)
                .tools(consultaTools, lancamentoTools, relatorioTools)
                .call()
                .chatResponse();

        String respostaTexto = response.getResult().getOutput().getText();

        log.info("[CHAT-USAGE] user={} usage={}", email, response.getMetadata().getUsage());

        historico.add(new AssistantMessage(respostaTexto));
        podarHistorico(historico);

        String downloadUrl = extrairDownloadUrl(respostaTexto);

        return new ChatResponseDto(respostaTexto, downloadUrl, List.of());
    }

    public void processarStream(ChatRequestDto request, SseEmitter emitter) {
        // Capture security context on the servlet thread before async hand-off
        String email = securityCtx.getEmail();
        String systemPrompt = promptBuilder.build(securityCtx.getUsuario());

        List<Message> historico = memoriaConversas
                .computeIfAbsent(email, k -> new ArrayList<>());
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
                    emitter.complete();
                })
                .doOnError(emitter::completeWithError)
                .subscribe();
    }

    public void limparHistorico() {
        memoriaConversas.remove(securityCtx.getEmail());
    }

    private void podarHistorico(List<Message> historico) {
        while (historico.size() > MAX_HISTORICO) {
            historico.remove(0);
        }
    }

    private String extrairDownloadUrl(String resposta) {
        if (resposta != null && resposta.contains("/api/chat/relatorios/")) {
            int inicio = resposta.indexOf("/api/chat/relatorios/");
            int fim = resposta.indexOf(".xlsx", inicio);
            if (fim > inicio) {
                return resposta.substring(inicio, fim + 5);
            }
        }
        return null;
    }
}
