package br.com.core4erp.chat.service;

import br.com.core4erp.chat.dto.ChatHistoricoItemDto;
import br.com.core4erp.chat.dto.ChatRequestDto;
import br.com.core4erp.chat.dto.ChatResponseDto;
import br.com.core4erp.chat.entity.ChatMensagem;
import br.com.core4erp.chat.metrics.ChatMetrics;
import br.com.core4erp.chat.tools.cadastro.CadastroTools;
import br.com.core4erp.chat.tools.consulta.ConsultaTools;
import br.com.core4erp.chat.tools.lancamento.LancamentoTools;
import br.com.core4erp.chat.tools.relatorio.RelatorioDownloadHolder;
import br.com.core4erp.chat.tools.gestao.GestaoFinanceiraTools;
import br.com.core4erp.chat.tools.relatorio.RelatorioTools;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.Timer;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
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
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
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
    private final GestaoFinanceiraTools gestaoFinanceiraTools;
    private final ChatMetrics chatMetrics;
    private final ChatMemoryService memoryService;
    private final ChatConversaService conversaService;
    private final RagService ragService;
    private final ObjectMapper objectMapper;
    private final TenantContext tenantCtx;
    private final N8nChatOrquestradorService n8nOrquestrador;
    private final String orquestrador;
    private final int maxHistorico;
    private final double precoInputPorMilhao;   // USD por 1M tokens de entrada (prompt)
    private final double precoOutputPorMilhao;  // USD por 1M tokens de saída (completion)

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
                       GestaoFinanceiraTools gestaoFinanceiraTools,
                       ChatMetrics chatMetrics,
                       ChatMemoryService memoryService,
                       ChatConversaService conversaService,
                       RagService ragService,
                       ObjectMapper objectMapper,
                       TenantContext tenantCtx,
                       N8nChatOrquestradorService n8nOrquestrador,
                       @Value("${chat.orquestrador:interno}") String orquestrador,
                       @Value("${chat.historico.max-mensagens:20}") int maxHistorico,
                       @Value("${chat.preco.input-usd-por-milhao:0.15}") double precoInputPorMilhao,
                       @Value("${chat.preco.output-usd-por-milhao:0.60}") double precoOutputPorMilhao) {
        this.chatClient = chatClientBuilder.build();
        this.promptBuilder = promptBuilder;
        this.securityCtx = securityCtx;
        this.sanitizer = sanitizer;
        this.consultaTools = consultaTools;
        this.lancamentoTools = lancamentoTools;
        this.relatorioTools = relatorioTools;
        this.cadastroTools = cadastroTools;
        this.gestaoFinanceiraTools = gestaoFinanceiraTools;
        this.chatMetrics = chatMetrics;
        this.memoryService = memoryService;
        this.conversaService = conversaService;
        this.ragService = ragService;
        this.objectMapper = objectMapper;
        this.tenantCtx = tenantCtx;
        this.n8nOrquestrador = n8nOrquestrador;
        this.orquestrador = orquestrador;
        this.maxHistorico = maxHistorico;
        this.precoInputPorMilhao = precoInputPorMilhao;
        this.precoOutputPorMilhao = precoOutputPorMilhao;
    }

    /** Anexa ao system prompt o material de referência (RAG) relevante à pergunta, se houver. */
    private String comContextoRag(String systemPrompt, String pergunta) {
        String rag = ragService.recuperarContexto(pergunta);
        return rag.isBlank() ? systemPrompt : systemPrompt + "\n\n" + rag;
    }

    /**
     * {@code true} apenas quando {@code chat.orquestrador=n8n}. Enquanto for {@code interno}
     * (padrão), TODO o comportamento de delegação ao n8n fica dormente — o pipeline interno
     * (Spring AI in-process) roda exatamente como antes.
     */
    private boolean usarN8n() {
        // 'n8n' → todos os usuários; 'shadow' → só admin do sistema (validação em produção sem
        // afetar os demais); 'interno' (default) ou qualquer outro → ninguém (pipeline in-process).
        if ("n8n".equalsIgnoreCase(orquestrador)) return true;
        if ("shadow".equalsIgnoreCase(orquestrador)) return tenantCtx.isAdminSistema();
        return false;
    }

    /**
     * Extrai o JWT bruto da requisição HTTP em andamento, para repassar ao n8n (que o usa no
     * header {@code Authorization: Bearer} ao chamar as tools de volta na API). Segue a MESMA
     * prioridade do {@link br.com.core4erp.config.security.JwtFilter}: 1º cookie httpOnly
     * {@code access_token}; 2º header {@code Authorization: Bearer}. Retorna {@code null} se não
     * houver requisição/token — nesse caso o chamador cai no pipeline interno.
     */
    private String jwtDaRequisicao() {
        RequestAttributes attrs = RequestContextHolder.getRequestAttributes();
        if (!(attrs instanceof ServletRequestAttributes servletAttrs)) {
            return null;
        }
        HttpServletRequest request = servletAttrs.getRequest();
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("access_token".equals(cookie.getName())) {
                    String value = cookie.getValue();
                    if (value != null && !value.isBlank()) {
                        return value;
                    }
                }
            }
        }
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String value = authHeader.substring(7).trim();
            if (!value.isEmpty()) {
                return value;
            }
        }
        return null;
    }

    public ChatResponseDto processar(ChatRequestDto request) {
        return processar(request, null, false);
    }

    /**
     * @param textoParaHistorico quando != null, é o que fica GRAVADO no histórico no lugar da
     *   mensagem enviada à IA. Usado pelo anexo: a IA recebe o conteúdo completo do arquivo NESTA
     *   requisição, mas no histórico guardamos só um resumo curto — senão o arquivo inteiro voltaria
     *   como contexto em toda mensagem seguinte, estourando o limite de tokens/min (429).
     */
    public ChatResponseDto processar(ChatRequestDto request, String textoParaHistorico) {
        return processar(request, textoParaHistorico, false);
    }

    /**
     * @param jaSanitizado quando {@code true}, a mensagem NÃO passa pelo {@link ChatInputSanitizer}.
     *   Usado pelo anexo: o prompt já é montado pelo servidor em {@code ChatAnexoService.processarAnexo}
     *   e já é limitado por {@code chat.anexo.max-chars}/{@code MAX_EXTRACT_CHARS}. Re-sanitizar aqui
     *   truncaria o conteúdo do arquivo em 4000 chars (teto do sanitizer), estrangulando extratos/
     *   planilhas e anulando o modo Pensamento Estendido. O fluxo de texto livre do usuário (UI de
     *   chat) SEMPRE chega com {@code false} e permanece sanitizado.
     */
    public ChatResponseDto processar(ChatRequestDto request, String textoParaHistorico, boolean jaSanitizado) {
        chatMetrics.registrarMensagem();
        Timer.Sample timer = chatMetrics.iniciarTimer();

        String email = securityCtx.getEmail();
        Long usuarioId = securityCtx.getUsuarioId();
        ChatMensagem.Canal canal = request.canalResolvido();
        Long conversaId = conversaService.resolverOuCriar(canal, request.conversaId()).getId();
        String systemPrompt = promptBuilder.build(securityCtx.getUsuario(), isPensamentoEstendido());
        String mensagemUsuario = jaSanitizado
                ? (request.mensagem() != null ? request.mensagem() : "")
                : sanitizer.sanitize(request.mensagem());

        // Ramo n8n (DORMENTE por padrão): só entra quando chat.orquestrador=n8n E há JWT na
        // requisição. Delega a orquestração ao WF-ROUTER; em qualquer falha/ausência de JWT cai
        // no pipeline interno abaixo (fallback). Com orquestrador=interno, nada aqui executa.
        if (usarN8n()) {
            String jwt = jwtDaRequisicao();
            if (jwt != null) {
                Optional<String> respN8n = n8nOrquestrador.orquestrar(conversaId, usuarioId,
                        tenantCtx.getEmpresaId(), canal.name(), mensagemUsuario, isPensamentoEstendido(), jwt);
                if (respN8n.isPresent()) {
                    // A resposta do n8n já é markdown final (inclusive eventual link de download);
                    // não passa por anexarDownload — este removeria links legítimos vindos do fluxo.
                    String respostaTexto = respN8n.get();
                    memoryService.registrar(usuarioId, conversaId, canal, ChatMensagem.Role.USER,
                            textoParaHistorico != null ? textoParaHistorico : mensagemUsuario);
                    memoryService.registrar(usuarioId, conversaId, canal, ChatMensagem.Role.ASSISTANT, respostaTexto);
                    conversaService.aposMensagem(conversaId, mensagemUsuario);
                    chatMetrics.finalizarTimer(timer);
                    return new ChatResponseDto(respostaTexto, extrairDownloadUrl(respostaTexto), List.of());
                }
                log.warn("[CHAT-N8N] orquestrador n8n indisponível, usando pipeline interno");
            } else {
                log.warn("[CHAT-N8N] orquestrador n8n habilitado mas sem JWT na requisição, usando pipeline interno");
            }
        }

        List<Message> allMessages = montarMensagens(conversaId, comContextoRag(systemPrompt, mensagemUsuario), mensagemUsuario);
        memoryService.registrar(usuarioId, conversaId, canal, ChatMensagem.Role.USER,
                textoParaHistorico != null ? textoParaHistorico : mensagemUsuario);

        try {
            OrigemIaHolder.marcarIa(); // auditoria grava is_ai_action=true nas escritas das tools
            ChatResponse response = chatClient.prompt()
                    .messages(allMessages)
                    .tools(consultaTools, lancamentoTools, relatorioTools, cadastroTools, gestaoFinanceiraTools)
                    .call()
                    .chatResponse();

            String respostaTexto = extrairTexto(response);
            String downloadUrl = RelatorioDownloadHolder.getAndClear(usuarioId);
            respostaTexto = anexarDownload(respostaTexto, downloadUrl);

            registrarUsage(response, email);
            memoryService.registrar(usuarioId, conversaId, canal, ChatMensagem.Role.ASSISTANT, respostaTexto);
            conversaService.aposMensagem(conversaId, mensagemUsuario);

            if (downloadUrl == null) {
                downloadUrl = extrairDownloadUrl(respostaTexto);
            }
            return new ChatResponseDto(respostaTexto, downloadUrl, List.of());
        } catch (Exception e) {
            chatMetrics.registrarErro();
            throw e;
        } finally {
            OrigemIaHolder.limpar();
            chatMetrics.finalizarTimer(timer);
        }
    }

    /** Pensamento Estendido: exclusivo do Administrador do sistema — a IA lê arquivos na íntegra. */
    private boolean isPensamentoEstendido() {
        try {
            return tenantCtx.isAdminSistema();
        } catch (Exception e) {
            return false;
        }
    }

    public void processarStream(ChatRequestDto request, SseEmitter emitter) {
        chatMetrics.registrarMensagem();
        chatMetrics.incrementarSessoes();

        // Captura identidade e contexto na thread da requisição (HTTP), antes do hand-off.
        String email = securityCtx.getEmail();
        Long usuarioId = securityCtx.getUsuarioId();
        ChatMensagem.Canal canal = request.canalResolvido();
        Long conversaId = conversaService.resolverOuCriar(canal, request.conversaId()).getId();
        String systemPrompt = promptBuilder.build(securityCtx.getUsuario(), isPensamentoEstendido());
        String mensagemUsuario = sanitizer.sanitize(request.mensagem());
        List<Message> allMessages = montarMensagens(conversaId, comContextoRag(systemPrompt, mensagemUsuario), mensagemUsuario);
        memoryService.registrar(usuarioId, conversaId, canal, ChatMensagem.Role.USER, mensagemUsuario);

        SecurityContext securityContext = SecurityContextHolder.getContext();
        RequestAttributes requestAttributes = RequestContextHolder.getRequestAttributes();
        // Captura o estado do tenant (empresa/permissões) da thread da requisição, onde ele está
        // populado. A requisição HTTP encerra antes do streaming, então não dá para depender do
        // escopo de requisição — guardamos a referência do estado e restauramos abaixo.
        TenantContext.State tenantState = TenantContext.currentState();

        // Ramo n8n (DORMENTE por padrão): captura o que o orquestrador precisa AINDA na thread da
        // requisição (JWT via cookie/header, empresaId, pensamento estendido), pois o
        // HttpServletRequest não é confiável após o hand-off. Com orquestrador=interno tudo fica
        // null/false e o streaming interno abaixo roda idêntico ao comportamento atual.
        boolean delegarN8n = usarN8n();
        String jwtN8n = delegarN8n ? jwtDaRequisicao() : null;
        Long empresaIdN8n = delegarN8n ? tenantCtx.getEmpresaId() : null;
        boolean pensamentoEstendidoN8n = delegarN8n && isPensamentoEstendido();

        streamExecutor.submit(() -> {
            StringBuilder full = new StringBuilder();
            AtomicReference<Usage> usageRef = new AtomicReference<>();
            AtomicReference<String> finishRef = new AtomicReference<>();
            try {
                // Restaura os contextos na thread que assina o fluxo. Com
                // spring.reactor.context-propagation=auto (ver ChatAiConfig), eles são capturados
                // daqui e restaurados nas threads do Reactor onde as tools executam.
                SecurityContextHolder.setContext(securityContext);
                TenantContext.restoreState(tenantState);
                OrigemIaHolder.marcarIa(); // auditoria grava is_ai_action=true nas escritas das tools
                if (requestAttributes != null) {
                    RequestContextHolder.setRequestAttributes(requestAttributes, true);
                }

                // Ramo n8n (dormente): resposta ÚNICA (não-streaming, Plano B do plano). Em sucesso,
                // emite o texto como um único delta pelo mesmo mecanismo do streaming e completa.
                // Em falha/empty (ou sem JWT), cai no streaming interno abaixo (fallback). O finally
                // desta task faz o cleanup dos contextos de qualquer forma.
                if (delegarN8n && jwtN8n != null) {
                    Optional<String> respN8n = n8nOrquestrador.orquestrar(conversaId, usuarioId,
                            empresaIdN8n, canal.name(), mensagemUsuario, pensamentoEstendidoN8n, jwtN8n);
                    if (respN8n.isPresent()) {
                        String respostaTexto = respN8n.get();
                        full.append(respostaTexto);
                        enviarDelta(emitter, respostaTexto);
                        memoryService.registrar(usuarioId, conversaId, canal, ChatMensagem.Role.ASSISTANT, full.toString());
                        conversaService.aposMensagem(conversaId, mensagemUsuario);
                        emitter.complete();
                        return;
                    }
                    log.warn("[CHAT-N8N] orquestrador n8n indisponível, usando pipeline interno");
                } else if (delegarN8n) {
                    log.warn("[CHAT-N8N] orquestrador n8n habilitado mas sem JWT na requisição, usando pipeline interno");
                }

                // .stream() emite a resposta em deltas (token a token). Cada delta é enviado ao
                // cliente imediatamente, dando feedback incremental em vez da tela em branco até o fim.
                // toStream() consome de forma bloqueante NESTA thread, mantendo o SecurityContext
                // ativo durante toda a execução (inclusive das tools) e a limpeza correta no finally.
                chatClient.prompt()
                        .messages(allMessages)
                        .tools(consultaTools, lancamentoTools, relatorioTools, cadastroTools, gestaoFinanceiraTools)
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
                memoryService.registrar(usuarioId, conversaId, canal, ChatMensagem.Role.ASSISTANT, full.toString());
                conversaService.aposMensagem(conversaId, mensagemUsuario);

                emitter.complete();
            } catch (Exception e) {
                chatMetrics.registrarErro();
                log.error("[CHAT-STREAM] erro ao processar mensagem de {}: {}", email, e.getMessage(), e);
                try {
                    // Em vez de derrubar o stream (tela em branco), envia uma mensagem amigável —
                    // ex.: limite de tokens/min da OpenAI (429) vira "aguarde e tente de novo".
                    if (full.length() == 0) enviarDelta(emitter, mensagemAmigavelErro(e));
                    emitter.complete();
                } catch (Exception ignored) {
                    // emitter já encerrado
                }
            } finally {
                chatMetrics.decrementarSessoes();
                RelatorioDownloadHolder.clear(usuarioId);
                RequestContextHolder.resetRequestAttributes();
                OrigemIaHolder.limpar();
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

    /** Compatibilidade (UI antiga): limpar = apagar todas as conversas do canal. */
    public void limparHistorico(ChatMensagem.Canal canal) {
        conversaService.limparCanal(canal);
    }

    /** Compatibilidade (UI antiga): conversa mais recente do canal como uma lista de mensagens. */
    public List<ChatHistoricoItemDto> historico(ChatMensagem.Canal canal) {
        return conversaService.conversaMaisRecente(canal)
                .map(c -> mensagensDaConversa(c.getId()))
                .orElseGet(List::of);
    }

    /** Mensagens de UMA conversa (com dono validado) — para a tela abrir a thread. */
    public List<ChatHistoricoItemDto> mensagensDaConversa(Long conversaId) {
        conversaService.owned(conversaId); // valida dono (404 se não for do usuário)
        return memoryService.mensagensDaConversa(conversaId).stream()
                .map(m -> new ChatHistoricoItemDto(
                        m.getRole() == ChatMensagem.Role.USER ? "user" : "assistant", m.getConteudo()))
                .toList();
    }

    private List<Message> montarMensagens(Long conversaId, String systemPrompt, String mensagemUsuario) {
        List<Message> historico = memoryService.carregarContexto(conversaId);
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
        double custo = (prompt / 1_000_000.0) * precoInputPorMilhao
                     + (completion / 1_000_000.0) * precoOutputPorMilhao;
        chatMetrics.registrarCusto(custo);
        log.info("[CHAT-USAGE] user={} promptTokens={} completionTokens={} custoUsd={}",
                email, prompt, completion, String.format(java.util.Locale.US, "%.6f", custo));
    }

    /** Traduz erros técnicos (ex.: 429 da OpenAI) em uma frase clara para o usuário no stream. */
    private String mensagemAmigavelErro(Throwable e) {
        String m = e.getMessage() != null ? e.getMessage() : "";
        if (m.contains("429") || m.contains("rate_limit") || m.contains("Rate limit")) {
            return "O assistente recebeu muitas solicitações em pouco tempo. Aguarde alguns segundos e tente novamente.";
        }
        return "O assistente está temporariamente indisponível. Tente novamente em instantes.";
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
