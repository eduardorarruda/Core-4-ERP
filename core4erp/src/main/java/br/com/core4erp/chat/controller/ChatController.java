package br.com.core4erp.chat.controller;

import br.com.core4erp.chat.dto.ChatRequestDto;
import br.com.core4erp.chat.dto.ChatResponseDto;
import br.com.core4erp.chat.service.ChatService;
import br.com.core4erp.chat.tools.relatorio.RelatorioExcelService;
import br.com.core4erp.config.security.SecurityContextUtils;
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
    private final RelatorioExcelService relatorioService;
    private final SecurityContextUtils securityCtx;

    public ChatController(ChatService chatService,
                          RelatorioExcelService relatorioService,
                          SecurityContextUtils securityCtx) {
        this.chatService = chatService;
        this.relatorioService = relatorioService;
        this.securityCtx = securityCtx;
    }

    @Operation(summary = "Enviar mensagem ao assistente de IA")
    @PostMapping
    public ResponseEntity<ChatResponseDto> enviarMensagem(
            @Valid @RequestBody ChatRequestDto request) {
        return ResponseEntity.ok(chatService.processar(request));
    }

    @Operation(summary = "Streaming SSE do assistente de IA")
    @PostMapping("/stream")
    public SseEmitter enviarMensagemStream(
            @Valid @RequestBody ChatRequestDto request) {
        SseEmitter emitter = new SseEmitter(300_000L);
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
