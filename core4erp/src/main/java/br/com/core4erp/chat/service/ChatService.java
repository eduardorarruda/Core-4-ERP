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
import br.com.core4erp.config.tenant.TenantContext;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final CadastroTools cadastroTools;
    private final ChatMetrics chatMetrics;
    private final ChatMemoryService memoryService;
    private final ObjectMapper objectMapper;
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
                       ObjectMapper objectMapper,
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
        this.objectMapper = objectMapper;
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
            String downloadUrl = RelatorioDownloadHolder.getAndClear(usuarioId);
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
        // Captura o estado do tenant (empresa/permissões) da thread da requisição, onde ele está
        // populado. A requisição HTTP encerra antes do streaming, então não dá para depender do
        // escopo de requisição — guardamos a referência do estado e restauramos abaixo.
        TenantContext.State tenantState = TenantContext.currentState();

        streamExecutor.submit(() -> {
            try {
                // Restaura os contextos na thread que assina o fluxo. Com
                // spring.reactor.context-propagation=auto (ver ChatAiConfig), eles são capturados
                // daqui e restaurados nas threads do Reactor onde as tools executam.
                SecurityContextHolder.setContext(securityContext);
                TenantContext.restoreState(tenantState);
                if (requestAttributes != null) {
                    RequestContextHolder.setRequestAttributes(requestAttributes, true);
                }

                StringBuilder full = new StringBuilder();
                AtomicReference<Usage> usageRef = new AtomicReference<>();
                AtomicReference<String> finishRef = new AtomicReference<>();

                // .stream() emite a resposta em deltas (token a token). Cada delta é enviado ao
                // cliente imediatamente, dando feedback incremental em vez da tela em branco até o fim.
                // toStream() consome de forma bloqueante NESTA thread, mantendo o SecurityContext
                // ativo durante toda a execução (inclusive das tools) e a limpeza correta no finally.
                chatClient.prompt()
                        .messages(allMessages)
                        .tools(consultaTools, lancamentoTools, relatorioTools, cadastroTools)
                        .stream()
                        .chatResponse()
                        .toStream()
                        .forEach(resp -> {
                            capturarMetadados(resp, usageRef, finishRef);
                            String delta = extrairTexto(resp);
                            if (!delta.isEmpty()) {
                                full.append(delta);
                                enviarDelta(emitter, delta);
                            }
                        });

                // Pós-processamento após o término do streaming.
                String downloadUrl = RelatorioDownloadHolder.getAndClear(usuarioId);
                if (downloadUrl != null) {
                    String linkMd = "\n\n[Baixar Relatório (.xlsx)](" + downloadUrl + ")";
                    full.append(linkMd);
                    enviarDelta(emitter, linkMd);
                }
                if ("LENGTH".equalsIgnoreCase(finishRef.get())) {
                    String aviso = "\n\n_(resposta truncada por limite de tamanho — peça a continuação se precisar de mais)_";
                    full.append(aviso);
                    enviarDelta(emitter, aviso);
                }

                registrarUsage(usageRef.get(), email);
                memoryService.registrar(usuarioId, ChatMensagem.Role.ASSISTANT, full.toString());

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
                RelatorioDownloadHolder.clear(usuarioId);
                RequestContextHolder.resetRequestAttributes();
                TenantContext.removeState();
                SecurityContextHolder.clearContext();
            }
        });
    }

    /**
     * Envia um delta de texto como um evento SSE. O payload é JSON ({@code {"t":"..."}}) numa
     * única linha — o JSON escapa quebras de linha do conteúdo, evitando que markdown com {@code \n}
     * quebre o framing {@code data:} do SSE. O front desserializa e concatena.
     */
    private void enviarDelta(SseEmitter emitter, String delta) {
        try {
            emitter.send(SseEmitter.event().data(objectMapper.writeValueAsString(new Delta(delta))));
        } catch (Exception e) {
            throw new RuntimeException("Falha ao enviar delta SSE", e);
        }
    }

    private record Delta(String t) {}

    private void capturarMetadados(ChatResponse resp, AtomicReference<Usage> usageRef, AtomicReference<String> finishRef) {
        if (resp == null) {
            return;
        }
        if (resp.getMetadata() != null && resp.getMetadata().getUsage() != null) {
            usageRef.set(resp.getMetadata().getUsage());
        }
        if (resp.getResult() != null && resp.getResult().getMetadata() != null) {
            String fr = resp.getResult().getMetadata().getFinishReason();
            if (fr != null && !fr.isBlank()) {
                finishRef.set(fr);
            }
        }
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
        registrarUsage(response.getMetadata().getUsage(), email);
    }

    private void registrarUsage(Usage usage, String email) {
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
