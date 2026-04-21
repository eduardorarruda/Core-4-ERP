package br.com.core4erp.notificacao.controller;

import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.notificacao.dto.NotificacaoResponseDto;
import br.com.core4erp.notificacao.service.NotificacaoService;
import br.com.core4erp.notificacao.service.SincronizacaoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Notificações", description = "Alertas de vencimento gerados automaticamente")
@RestController
@RequestMapping("/api/notificacoes")
public class NotificacaoController {

    private final NotificacaoService notificacaoService;
    private final SincronizacaoService sincronizacaoService;
    private final SecurityContextUtils securityCtx;

    public NotificacaoController(NotificacaoService notificacaoService,
                                  SincronizacaoService sincronizacaoService,
                                  SecurityContextUtils securityCtx) {
        this.notificacaoService = notificacaoService;
        this.sincronizacaoService = sincronizacaoService;
        this.securityCtx = securityCtx;
    }

    @Operation(summary = "Listar notificações não lidas do usuário")
    @GetMapping
    public ResponseEntity<List<NotificacaoResponseDto>> listar() {
        return ResponseEntity.ok(notificacaoService.listarNaoLidas());
    }

    @Operation(summary = "Marcar notificação como lida")
    @PatchMapping("/{id}/lida")
    public ResponseEntity<NotificacaoResponseDto> marcarLida(@PathVariable Long id) {
        return ResponseEntity.ok(notificacaoService.marcarComoLida(id));
    }

    @Operation(summary = "Gerar/sincronizar notificações com base nas contas vencidas ou próximas")
    @PostMapping("/sincronizar")
    public ResponseEntity<Void> sincronizar() {
        sincronizacaoService.sincronizar(securityCtx.getUsuarioId());
        return ResponseEntity.noContent().build();
    }
}
