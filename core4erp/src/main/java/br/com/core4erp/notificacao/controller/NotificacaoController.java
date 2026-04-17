package br.com.core4erp.notificacao.controller;

import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.notificacao.dto.NotificacaoResponseDto;
import br.com.core4erp.notificacao.service.NotificacaoService;
import br.com.core4erp.notificacao.service.SincronizacaoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @GetMapping
    public ResponseEntity<List<NotificacaoResponseDto>> listar() {
        return ResponseEntity.ok(notificacaoService.listarNaoLidas());
    }

    @PatchMapping("/{id}/lida")
    public ResponseEntity<NotificacaoResponseDto> marcarLida(@PathVariable Long id) {
        return ResponseEntity.ok(notificacaoService.marcarComoLida(id));
    }

    @PostMapping("/sincronizar")
    public ResponseEntity<Void> sincronizar() {
        sincronizacaoService.sincronizar(securityCtx.getUsuarioId());
        return ResponseEntity.noContent().build();
    }
}
