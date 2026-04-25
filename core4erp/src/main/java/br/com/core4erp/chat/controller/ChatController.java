package br.com.core4erp.chat.controller;

import br.com.core4erp.chat.dto.ChatRequestDto;
import br.com.core4erp.chat.dto.ChatResponseDto;
import br.com.core4erp.chat.service.ChatService;
import br.com.core4erp.chat.tools.relatorio.RelatorioExcelService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Tag(name = "Chat IA", description = "Assistente financeiro com inteligência artificial")
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;
    private final RelatorioExcelService relatorioService;

    public ChatController(ChatService chatService,
                          RelatorioExcelService relatorioService) {
        this.chatService = chatService;
        this.relatorioService = relatorioService;
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
    public ResponseEntity<Resource> downloadRelatorio(
            @PathVariable String fileName,
            Authentication auth) {
        Resource file = relatorioService.getRelatorio(auth.getName(), fileName);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fileName + "\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(file);
    }
}
