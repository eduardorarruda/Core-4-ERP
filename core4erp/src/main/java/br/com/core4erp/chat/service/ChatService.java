package br.com.core4erp.chat.service;

import br.com.core4erp.chat.dto.ChatRequestDto;
import br.com.core4erp.chat.dto.ChatResponseDto;
import br.com.core4erp.chat.entity.ChatMensagem;
import br.com.core4erp.chat.metrics.ChatMetrics;
import br.com.core4erp.chat.tools.cadastro.CadastroTools;
import br.com.core4erp.chat.tools.consulta.ConsultaTools;
import br.com.core4erp.chat.tools.lancamento.LancamentoTools;
import br.com.core4erp.chat.tools.relatorio.RelatorioDownloadHolder;
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
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
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
    private final CadastroTools cadastroTools;
    private final ChatMetrics chatMetrics;
    private final ChatMemoryService memoryService;
    private final int maxHistorico;

    /**
     * Pool dedicado para o processamento assíncrono do streaming. Cada tarefa restaura
     * o SecurityContext e os RequestAttributes capturados da thread da requisição, de modo
     * que as tools (e os serviços de domínio que dependem de {@link SecurityContextUtils})
     * executem com o usuário/tenant correto — algo que a execução em threads do Reactor não
     * garantia.
     */
    private final ExecutorService streamExecutor = Executors.newFixedThreadPool(16, r -> {
        Thread t = new Thread(r, "chat-stream");
        t.setDaemon(true);
        return t;
    });

    private static final Pattern DOWNLOAD_URL_PATTERN =
            Pattern.compile("/api/chat/relatorios/[^\\s\"'<>]+\\.xlsx");

    public ChatService(ChatClient.Builder chatClientBuilder,
                       SystemPromptBuilder promptBuilder,
                       SecurityContextUtils securityCtx,
                       ChatInputSanitizer sanitizer,
                       ConsultaTools consultaTools,
                       LancamentoTools lancamentoTools,
                       RelatorioTools relatorioTools,
                       CadastroTools cadastroTools,
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
        this.cadastroTools = cadastroTools;
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
                    .tools(consultaTools, lancamentoTools, relatorioTools, cadastroTools)
                    .call()
                    .chatResponse();

            String respostaTexto = extrairTexto(response);
            String downloadUrl = RelatorioDownloadHolder.getAndClear();
            respostaTexto = anexarDownload(respostaTexto, downloadUrl);

            registrarUsage(response, email);
            memoryService.registrar(usuarioId, ChatMensagem.Role.ASSISTANT, respostaTexto);

            if (downloadUrl == null) {
                downloadUrl = extrairDownloadUrl(respostaTexto);
            }
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

        // Captura identidade e contexto na thread da requisição (HTTP), antes do hand-off.
        String email = securityCtx.getEmail();
        Long usuarioId = securityCtx.getUsuarioId();
        String systemPrompt = promptBuilder.build(securityCtx.getUsuario());
        String mensagemUsuario = sanitizer.sanitize(request.mensagem());
        List<Message> allMessages = montarMensagens(usuarioId, systemPrompt, mensagemUsuario);
        memoryService.registrar(usuarioId, ChatMensagem.Role.USER, mensagemUsuario);

        SecurityContext securityContext = SecurityContextHolder.getContext();
        RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();

        streamExecutor.submit(() -> {
            try {
                // Restaura o contexto na thread de execução para que tools e serviços de
                // domínio (que usam SecurityContextUtils) enxerguem o usuário correto.
                SecurityContextHolder.setContext(securityContext);
                if (requestAttributes != null) {
                    RequestContextHolder.setRequestAttributes(requestAttributes, true);
                }

                ChatResponse response = chatClient.prompt()
                        .messages(allMessages)
                        .tools(consultaTools, lancamentoTools, relatorioTools, cadastroTools)
                        .call()
                        .chatResponse();

                String respostaTexto = extrairTexto(response);
                respostaTexto = anexarDownload(respostaTexto, RelatorioDownloadHolder.getAndClear());

                registrarUsage(response, email);
                memoryService.registrar(usuarioId, ChatMensagem.Role.ASSISTANT, respostaTexto);

                emitter.send(SseEmitter.event().data(respostaTexto));
                emitter.complete();
            } catch (Exception e) {
                chatMetrics.registrarErro();
                log.error("[CHAT-STREAM] erro ao processar mensagem de {}: {}", email, e.getMessage(), e);
                try {
                    emitter.completeWithError(e);
                } catch (Exception ignored) {
                    // emitter já encerrado
                }
            } finally {
                chatMetrics.decrementarSessoes();
                RelatorioDownloadHolder.clear();
                RequestContextHolder.resetRequestAttributes();
                SecurityContextHolder.clearContext();
            }
        });
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

    private String extrairTexto(ChatResponse response) {
        if (response == null || response.getResult() == null || response.getResult().getOutput() == null) {
            return "";
        }
        String texto = response.getResult().getOutput().getText();
        return texto != null ? texto : "";
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

    // Remove qualquer referência a relatório que o modelo tenha escrito (markdown link com
    // domínio inventado, ex.: example.com, ou URL "crua"), para anexarmos um único link limpo.
    private static final Pattern RELATORIO_MD_LINK =
            Pattern.compile("\\[[^\\]]*\\]\\([^)]*/api/chat/relatorios/[^)]*\\)");
    private static final Pattern RELATORIO_BARE_URL =
            Pattern.compile("\\S*/api/chat/relatorios/\\S*");

    /**
     * Garante exatamente um link de download correto e relativo. Remove qualquer link/URL de
     * relatório escrito pelo modelo (que costuma inventar o domínio) e anexa o nosso, relativo
     * à origem — assim o nginx faz o proxy para o backend com o cookie de autenticação.
     */
    private String anexarDownload(String texto, String url) {
        String base = texto != null ? texto : "";
        base = RELATORIO_MD_LINK.matcher(base).replaceAll("");
        base = RELATORIO_BARE_URL.matcher(base).replaceAll("");
        base = base.strip();
        if (url == null) {
            return base;
        }
        return base + "\n\n[Baixar Relatório (.xlsx)](" + url + ")";
    }

    private String extrairDownloadUrl(String resposta) {
        if (resposta == null) return null;
        Matcher m = DOWNLOAD_URL_PATTERN.matcher(resposta);
        return m.find() ? m.group() : null;
    }
}
