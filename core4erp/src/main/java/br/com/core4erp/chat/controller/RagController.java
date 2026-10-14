package br.com.core4erp.chat.controller;

import br.com.core4erp.chat.service.RagSincronizacaoService;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.tenant.TenantContext;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "RAG", description = "Sincronização da base semântica (RAG) do assistente")
@RestController
@RequestMapping("/api/chat/rag")
public class RagController {

    private final RagSincronizacaoService ragSincronizacaoService;
    private final TenantContext tenantCtx;

    public RagController(RagSincronizacaoService ragSincronizacaoService, TenantContext tenantCtx) {
        this.ragSincronizacaoService = ragSincronizacaoService;
        this.tenantCtx = tenantCtx;
    }

    @Operation(summary = "Re-sincroniza os resumos financeiros da empresa na base do assistente")
    @PostMapping("/sincronizar")
    @Requer("CONFIGURACAO_EDITAR")
    public ResponseEntity<Map<String, Object>> sincronizar() {
        tenantCtx.exigirContaEmpresa();
        int documentos = ragSincronizacaoService.sincronizarEmpresaManual(tenantCtx.getEmpresaId());
        return ResponseEntity.ok(Map.of(
                "mensagem", "Sincronização concluída. O assistente já considera os dados mais recentes.",
                "documentosAtualizados", documentos));
    }
}
