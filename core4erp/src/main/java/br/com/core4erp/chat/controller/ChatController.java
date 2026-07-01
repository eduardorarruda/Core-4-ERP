package br.com.core4erp.chat.controller;

import br.com.core4erp.chat.dto.ChatRequestDto;
import br.com.core4erp.chat.dto.ChatResponseDto;
import br.com.core4erp.chat.dto.RagIndexarRequestDto;
import br.com.core4erp.chat.service.ChatAnexoService;
import br.com.core4erp.chat.service.ChatService;
import br.com.core4erp.chat.service.RagService;
import br.com.core4erp.chat.tools.relatorio.RelatorioExcelService;
import br.com.core4erp.config.security.SecurityContextUtils;
import org.springframework.web.multipart.MultipartFile;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Tag(name = "Chat IA", description = "Assistente financeiro com inteligência artificial")
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final ChatAnexoService chatAnexoService;
    private final RagService ragService;
    private final RelatorioExcelService relatorioService;
    private final SecurityContextUtils securityCtx;

    public ChatController(ChatService chatService,
                          ChatAnexoService chatAnexoService,
                          RagService ragService,
                          RelatorioExcelService relatorioService,
                          SecurityContextUtils securityCtx) {
        this.chatService = chatService;
        this.chatAnexoService = chatAnexoService;
        this.ragService = ragService;
        this.relatorioService = relatorioService;
        this.securityCtx = securityCtx;
    }

    @Operation(summary = "Enviar mensagem ao assistente de IA")
    @PostMapping
    public ResponseEntity<ChatResponseDto> enviarMensagem(
            @Valid @RequestBody ChatRequestDto request) {
        return ResponseEntity.ok(chatService.processar(request));
    }

    @Operation(summary = "Enviar arquivo (planilha/OFX/PDF) + instrução para a IA analisar e processar")
    @PostMapping(value = "/anexo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ChatResponseDto> enviarAnexo(
            @RequestParam("arquivo") MultipartFile arquivo,
            @RequestParam(value = "mensagem", required = false) String mensagem) {
        return ResponseEntity.ok(chatAnexoService.processarAnexo(arquivo, mensagem));
    }

    @Operation(summary = "Indexar texto na base de conhecimento (RAG) da empresa")
    @PostMapping("/rag/indexar")
    public ResponseEntity<java.util.Map<String, Object>> indexarRag(@Valid @RequestBody RagIndexarRequestDto req) {
        int trechos = ragService.indexar(req.texto(), req.tipo(), req.fonte());
        return ResponseEntity.ok(java.util.Map.of("indexado", true, "trechos", trechos));
    }

    @Operation(summary = "Streaming SSE do assistente de IA")
    @PostMapping("/stream")
    public SseEmitter enviarMensagemStream(
            @Valid @RequestBody ChatRequestDto request) {
        // 4.2: timeout reduzido (120s) — limita threads do pool de streaming presas caso a IA
        // demore/trave, reduzindo o risco de exaustão. Respostas são limitadas por max-tokens.
        SseEmitter emitter = new SseEmitter(120_000L);
        emitter.onTimeout(emitter::complete);
        chatService.processarStream(request, emitter);
        return emitter;
    }

    @Operation(summary = "Limpar histórico de conversa")
    @DeleteMapping("/historico")
    public ResponseEntity<Void> limparHistorico() {
        chatService.limparHistorico();
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Download de relatório gerado pelo chat")
    @GetMapping("/relatorios/{fileName}")
    public ResponseEntity<Resource> downloadRelatorio(@PathVariable String fileName) {
        String ownerEmail = securityCtx.getEmail();
        Resource file = relatorioService.getRelatorio(ownerEmail, fileName);
        String encodedName = URLEncoder.encode(fileName, StandardCharsets.UTF_8).replace("+", "%20");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename*=UTF-8''" + encodedName)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(file);
    }
}
