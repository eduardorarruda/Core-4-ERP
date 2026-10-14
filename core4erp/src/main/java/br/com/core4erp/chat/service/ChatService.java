package br.com.core4erp.chat.service;

import br.com.core4erp.chat.dto.ChatHistoricoItemDto;
import br.com.core4erp.chat.dto.ChatRequestDto;
import br.com.core4erp.chat.dto.ChatResponseDto;
import br.com.core4erp.chat.entity.ChatMensagem;
import br.com.core4erp.chat.metrics.ChatMetrics;
import br.com.core4erp.chat.tools.cadastro.CadastroTools;
import br.com.core4erp.chat.tools.consulta.AnaliseFinanceiraTools;
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
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
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
    private final AnaliseFinanceiraTools analiseFinanceiraTools;
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
    private final AcoesCriticasPendentes acoesCriticas;
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

    // Envia comentários SSE de keepalive enquanto a thread de streaming fica bloqueada esperando a
    // resposta (única) do orquestrador n8n — sem isso o Cloudflare (idle ~100s) e o nginx derrubam a
    // conexão durante o pipeline LOTE multi-agente, que pode levar dezenas de segundos.
    private final ScheduledExecutorService keepaliveScheduler = Executors.newScheduledThreadPool(2, r -> {
        Thread t = new Thread(r, "chat-keepalive");
        t.setDaemon(true);
        return t;
    });

    /** Anexado (e gravado) quando o stream cai depois de já ter enviado parte da resposta. */
    static final String AVISO_RESPOSTA_INTERROMPIDA =
            "\n\n_(A resposta foi interrompida. Tente novamente.)_";

    private static final Pattern DOWNLOAD_URL_PATTERN =
            Pattern.compile("/api/chat/relatorios/[^\\s\"'<>]+\\.xlsx");

    public ChatService(ChatClient.Builder chatClientBuilder,
                       SystemPromptBuilder promptBuilder,
                       SecurityContextUtils securityCtx,
                       ChatInputSanitizer sanitizer,
                       ConsultaTools consultaTools,
                       AnaliseFinanceiraTools analiseFinanceiraTools,
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
                       AcoesCriticasPendentes acoesCriticas,
                       @Value("${chat.orquestrador:interno}") String orquestrador,
                       @Value("${chat.historico.max-mensagens:20}") int maxHistorico,
                       @Value("${chat.preco.input-usd-por-milhao:0.15}") double precoInputPorMilhao,
                       @Value("${chat.preco.output-usd-por-milhao:0.60}") double precoOutputPorMilhao) {
        this.chatClient = chatClientBuilder.build();
        this.promptBuilder = promptBuilder;
        this.securityCtx = securityCtx;
        this.sanitizer = sanitizer;
        this.consultaTools = consultaTools;
        this.analiseFinanceiraTools = analiseFinanceiraTools;
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
        this.acoesCriticas = acoesCriticas;
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
     *
     * <p>Atenção: no modo n8n as tools são chamadas via REST com o JWT do usuário, então o
     * {@link GateAcaoCriticaAspect} (confirmação técnica de ações críticas) NÃO se aplica — lá a
     * confirmação é só instrução de prompt. Em produção, prefira {@code interno} (padrão).
     */
    private boolean usarN8n() {
        // 'n8n' → todos os usuários; 'shadow' → só admin do sistema (validação em produção sem
        // afetar os demais); 'interno' (default) ou qualquer outro → ninguém (pipeline in-process).
        if ("n8n".equalsIgnoreCase(orquestrador)) return true;
        if ("shadow".equalsIgnoreCase(orquestrador)) return tenantCtx.isAdminSistema();
        return false;
    }

    /**
     * Abre o turno do pipeline interno para o {@link GateAcaoCriticaAspect}: número sequencial na
     * conversa + se a mensagem é confirmação explícita ("sim"). Prompt montado pelo servidor (anexo)
     * ou turno com anexo NUNCA conta como confirmação — o conteúdo do arquivo não pode dizer "sim".
     * Só o pipeline interno usa: no modo n8n as tools são chamadas via REST e a confirmação de ações
     * críticas segue apenas como instrução de prompt (ver CLAUDE.md §23).
     */
    private TurnoChatHolder.Turno abrirTurno(Long conversaId, Long usuarioId, String mensagemUsuario,
                                             boolean promptMontado) {
        boolean confirmacao = !promptMontado
                && !TurnoAnexoHolder.isTurnoComAnexo()
                && ConfirmacaoUsuario.isConfirmacaoExplicita(mensagemUsuario);
        return acoesCriticas.iniciarTurno(conversaId, usuarioId, confirmacao);
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
        return processar(request, null, 0);
    }

    /**
     * @param textoParaHistorico quando != null, é o que fica GRAVADO no histórico no lugar da
     *   mensagem enviada à IA. Usado pelo anexo: a IA recebe o conteúdo completo do arquivo NESTA
     *   requisição, mas no histórico guardamos só um resumo curto — senão o arquivo inteiro voltaria
     *   como contexto em toda mensagem seguinte, estourando o limite de tokens/min (429).
     */
    public ChatResponseDto processar(ChatRequestDto request, String textoParaHistorico) {
        return processar(request, textoParaHistorico, 0);
    }

    /**
     * @param limitePromptMontado {@code 0} = mensagem digitada pelo usuário (sanitização completa,
     *   teto de {@link ChatInputSanitizer#MAX_CHARS}). {@code > 0} = prompt montado pelo servidor para
     *   um anexo ({@code ChatAnexoService}), cujas partes variáveis já foram sanitizadas e delimitadas
     *   como conteúdo não confiável; aqui aplica-se só o teto informado (proporcional ao anexo) —
     *   nunca há bypass do {@link ChatInputSanitizer}.
     */
    public ChatResponseDto processar(ChatRequestDto request, String textoParaHistorico, int limitePromptMontado) {
        chatMetrics.registrarMensagem();
        Timer.Sample timer = chatMetrics.iniciarTimer();

        Long usuarioId = securityCtx.getUsuarioId();
        ChatMensagem.Canal canal = request.canalResolvido();
        Long conversaId = conversaService.resolverOuCriar(canal, request.conversaId()).getId();
        String systemPrompt = promptBuilder.build(securityCtx.getUsuario(), isPensamentoEstendido());
        String mensagemUsuario = limitePromptMontado > 0
                ? sanitizer.limitarPromptMontado(request.mensagem(), limitePromptMontado)
                : sanitizer.sanitize(request.mensagem());

        // Ramo n8n (DORMENTE por padrão): só entra quando chat.orquestrador=n8n E há JWT na
        // requisição. Delega a orquestração ao WF-ROUTER; em qualquer falha/ausência de JWT cai
        // no pipeline interno abaixo (fallback). Com orquestrador=interno, nada aqui executa.
        // Turno com anexo NUNCA é delegado: o portão de escrita (GateEscritaAnexoAspect) só existe
        // no pipeline interno — no n8n as tools voltariam pela API sem esse bloqueio.
        if (usarN8n() && !TurnoAnexoHolder.isTurnoComAnexo()) {
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
                    conversaService.aposMensagem(conversaId, textoParaHistorico != null ? textoParaHistorico : mensagemUsuario);
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
            TurnoChatHolder.definir(abrirTurno(conversaId, usuarioId, mensagemUsuario, limitePromptMontado > 0));
            ChatResponse response = chatClient.prompt()
                    .messages(allMessages)
                    .tools(consultaTools, analiseFinanceiraTools, lancamentoTools, relatorioTools, cadastroTools,
                            gestaoFinanceiraTools)
                    .call()
                    .chatResponse();

            String respostaTexto = extrairTexto(response);
            String downloadUrl = RelatorioDownloadHolder.getAndClear(usuarioId);
            respostaTexto = anexarDownload(respostaTexto, downloadUrl);
            if (respostaTexto.isBlank()) {
                // Modelo devolveu vazio: grava o marcador para a pergunta não ficar sem resposta.
                respostaTexto = RespostaFalhaChat.TEXTO_PADRAO;
            }

            registrarUsage(response, usuarioId);
            memoryService.registrar(usuarioId, conversaId, canal, ChatMensagem.Role.ASSISTANT, respostaTexto);
            // Título da conversa: no anexo, o resumo curto (nunca o prompt com o conteúdo do arquivo).
            conversaService.aposMensagem(conversaId, textoParaHistorico != null ? textoParaHistorico : mensagemUsuario);

            if (downloadUrl == null) {
                downloadUrl = extrairDownloadUrl(respostaTexto);
            }
            return new ChatResponseDto(respostaTexto, downloadUrl, List.of());
        } catch (Exception e) {
            chatMetrics.registrarErro();
            // A pergunta já foi gravada: grava também o marcador de falha, senão ao reabrir a
            // conversa a pergunta aparece sem resposta. O erro segue para o GlobalExceptionHandler
            // (503 amigável para erros da OpenAI).
            registrarFalha(usuarioId, conversaId, canal, RespostaFalhaChat.textoPara(e),
                    textoParaHistorico != null ? textoParaHistorico : mensagemUsuario);
            throw e;
        } finally {
            OrigemIaHolder.limpar();
            TurnoChatHolder.limpar();
            chatMetrics.finalizarTimer(timer);
        }
    }

    /**
     * Grava a resposta de falha ({@link RespostaFalhaChat}) no histórico e atualiza a conversa.
     * Best-effort: um erro aqui (ex.: banco fora) só é logado — nunca mascara o erro original.
     */
    private void registrarFalha(Long usuarioId, Long conversaId, ChatMensagem.Canal canal,
                                String textoFalha, String perguntaParaTitulo) {
        try {
            memoryService.registrar(usuarioId, conversaId, canal, ChatMensagem.Role.ASSISTANT, textoFalha);
            conversaService.aposMensagem(conversaId, perguntaParaTitulo);
        } catch (Exception persistencia) {
            log.warn("[CHAT] não foi possível gravar o marcador de falha conversaId={}: {}",
                    conversaId, persistencia.getMessage());
        }
    }

    /** Pensamento Estendido: exclusivo do Administrador do sistema — a IA lê arquivos na íntegra. */
    private boolean isPensamentoEstendido() {
        try {
            return tenantCtx.isAdminSistema();
        } catch (Exception e) {
            log.debug("[CHAT] contexto de tenant indisponível — sem pensamento estendido: {}", e.getMessage());
            return false;
        }
    }

    public void processarStream(ChatRequestDto request, SseEmitter emitter) {
        chatMetrics.registrarMensagem();
        chatMetrics.incrementarSessoes();

        // Captura identidade e contexto na thread da requisição (HTTP), antes do hand-off.
        Long usuarioId = securityCtx.getUsuarioId();
        ChatMensagem.Canal canal = request.canalResolvido();
        Long conversaId = conversaService.resolverOuCriar(canal, request.conversaId()).getId();
        String mensagemUsuario = sanitizer.sanitize(request.mensagem());
        // Montagem do prompt (system + RAG + histórico) ANTES de gravar a pergunta (senão ela entraria
        // duplicada no contexto). Qualquer falha aqui vira resposta amigável no próprio stream — nunca
        // um 4xx/5xx com mensagem técnica (ex.: IllegalFormatException → "Format specifier '% e'").
        List<Message> allMessages;
        try {
            String systemPrompt = promptBuilder.build(securityCtx.getUsuario(), isPensamentoEstendido());
            allMessages = montarMensagens(conversaId, comContextoRag(systemPrompt, mensagemUsuario), mensagemUsuario);
        } catch (RuntimeException e) {
            chatMetrics.registrarErro();
            chatMetrics.decrementarSessoes();
            log.error("[CHAT-STREAM] falha ao montar o prompt usuarioId={} conversaId={}: {}",
                    usuarioId, conversaId, e.getClass().getSimpleName(), e);
            memoryService.registrar(usuarioId, conversaId, canal, ChatMensagem.Role.USER, mensagemUsuario);
            String textoFalha = RespostaFalhaChat.textoPara(e);
            registrarFalha(usuarioId, conversaId, canal, textoFalha, mensagemUsuario);
            enviarFalhaEEncerrar(emitter, textoFalha);
            return;
        }
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
            AtomicBoolean respostaGravada = new AtomicBoolean(false);
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
                    Optional<String> respN8n = orquestrarComKeepalive(emitter, conversaId, usuarioId,
                            empresaIdN8n, canal.name(), mensagemUsuario, pensamentoEstendidoN8n, jwtN8n);
                    if (respN8n.isPresent()) {
                        String respostaTexto = respN8n.get();
                        full.append(respostaTexto);
                        // synchronized: garante que um keepalive em voo (do agendador) já terminou
                        // antes de escrever o delta real — sem intercalar bytes no mesmo emitter.
                        synchronized (emitter) {
                            enviarDelta(emitter, respostaTexto);
                        }
                        memoryService.registrar(usuarioId, conversaId, canal, ChatMensagem.Role.ASSISTANT, full.toString());
                        respostaGravada.set(true);
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
                // O turno (gate de ações críticas) é propagado às threads do Reactor como os demais.
                TurnoChatHolder.definir(abrirTurno(conversaId, usuarioId, mensagemUsuario, false));
                chatClient.prompt()
                        .messages(allMessages)
                        .tools(consultaTools, analiseFinanceiraTools, lancamentoTools, relatorioTools, cadastroTools,
                                gestaoFinanceiraTools)
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

                if (full.length() == 0) {
                    // Stream terminou sem nenhum texto: marcador de falha em vez de bolha vazia.
                    full.append(RespostaFalhaChat.TEXTO_PADRAO);
                    enviarDelta(emitter, RespostaFalhaChat.TEXTO_PADRAO);
                }

                registrarUsage(usageRef.get(), usuarioId);
                memoryService.registrar(usuarioId, conversaId, canal, ChatMensagem.Role.ASSISTANT, full.toString());
                respostaGravada.set(true);
                conversaService.aposMensagem(conversaId, mensagemUsuario);

                emitter.complete();
            } catch (Exception e) {
                chatMetrics.registrarErro();
                log.error("[CHAT-STREAM] erro ao processar mensagem usuarioId={}: {}", usuarioId, e.getMessage(), e);
                // Em vez de derrubar o stream (tela em branco), responde com texto amigável — ex.: limite
                // de tokens/min da OpenAI (429) vira "aguarde e tente de novo". O MESMO texto é gravado
                // no histórico (antes, só a pergunta ficava salva e a conversa reaberta não tinha resposta).
                // Se parte da resposta já tinha saído, grava o parcial + aviso de interrupção.
                if (respostaGravada.get()) {
                    // A resposta já está no histórico (falhou só o pós-processamento): só encerra.
                    enviarFalhaEEncerrar(emitter, null);
                } else {
                    boolean semTexto = full.length() == 0;
                    String aviso = semTexto ? RespostaFalhaChat.textoPara(e) : AVISO_RESPOSTA_INTERROMPIDA;
                    registrarFalha(usuarioId, conversaId, canal, semTexto ? aviso : full + aviso, mensagemUsuario);
                    enviarFalhaEEncerrar(emitter, aviso);
                }
            } finally {
                chatMetrics.decrementarSessoes();
                RelatorioDownloadHolder.clear(usuarioId);
                RequestContextHolder.resetRequestAttributes();
                OrigemIaHolder.limpar();
                TurnoChatHolder.limpar();
                TenantContext.removeState();
                SecurityContextHolder.clearContext();
            }
        });
    }

    /**
     * Chama o orquestrador n8n (bloqueante, até {@code chat.n8n.read-timeout-seconds}) emitindo um
     * comentário SSE de keepalive a cada 15s enquanto espera. Sem isso, o pipeline LOTE multi-agente
     * ficaria em silêncio por dezenas de segundos e o Cloudflare (idle ~100s)/nginx derrubariam a
     * conexão. O keepalive é serializado com o delta real via {@code synchronized(emitter)} no
     * chamador; falha ao enviar keepalive (cliente desconectado) é ignorada — o cancelamento no
     * {@code finally} encerra o agendador e a chamada ao n8n segue seu curso.
     */
    private Optional<String> orquestrarComKeepalive(SseEmitter emitter, Long conversaId, Long usuarioId,
            Long empresaId, String canal, String mensagem, boolean pensamentoEstendido, String jwt) {
        ScheduledFuture<?> heartbeat = keepaliveScheduler.scheduleAtFixedRate(() -> {
            synchronized (emitter) {
                try {
                    emitter.send(SseEmitter.event().comment("keepalive"));
                } catch (Exception desconectado) {
                    // Emitter encerrado ou cliente desconectado — esperado; o finally cancela o agendador.
                    log.debug("[CHAT-STREAM] keepalive não enviado (cliente desconectado): {}", desconectado.getMessage());
                }
            }
        }, 15, 15, TimeUnit.SECONDS);
        try {
            return n8nOrquestrador.orquestrar(conversaId, usuarioId, empresaId, canal, mensagem,
                    pensamentoEstendido, jwt);
        } finally {
            heartbeat.cancel(false);
        }
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
                .map(m -> {
                    boolean usuario = m.getRole() == ChatMensagem.Role.USER;
                    return new ChatHistoricoItemDto(usuario ? "user" : "assistant", m.getConteudo(),
                            !usuario && RespostaFalhaChat.ehMarcador(m.getConteudo()));
                })
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

    private void registrarUsage(ChatResponse response, Long usuarioId) {
        if (response == null || response.getMetadata() == null) {
            return;
        }
        registrarUsage(response.getMetadata().getUsage(), usuarioId);
    }

    private void registrarUsage(Usage usage, Long usuarioId) {
        if (usage == null) {
            return;
        }
        long prompt = usage.getPromptTokens() != null ? usage.getPromptTokens().longValue() : 0L;
        long completion = usage.getCompletionTokens() != null ? usage.getCompletionTokens().longValue() : 0L;
        chatMetrics.registrarTokens(prompt, completion);
        double custo = (prompt / 1_000_000.0) * precoInputPorMilhao
                     + (completion / 1_000_000.0) * precoOutputPorMilhao;
        chatMetrics.registrarCusto(custo);
        // LGPD: identifica o usuário pelo id (nunca e-mail em log).
        log.info("[CHAT-USAGE] usuarioId={} promptTokens={} completionTokens={} custoUsd={}",
                usuarioId, prompt, completion, String.format(java.util.Locale.US, "%.6f", custo));
    }

    /**
     * Envia o texto de falha (se houver) como último delta e encerra o stream; emitter já fechado
     * (cliente desconectou) é ignorado.
     */
    private void enviarFalhaEEncerrar(SseEmitter emitter, String texto) {
        try {
            if (texto != null) enviarDelta(emitter, texto);
            emitter.complete();
        } catch (Exception emitterEncerrado) {
            log.debug("[CHAT-STREAM] emitter já encerrado ao enviar erro: {}", emitterEncerrado.getMessage());
        }
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
