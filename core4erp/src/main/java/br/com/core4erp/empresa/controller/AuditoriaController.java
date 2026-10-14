package br.com.core4erp.empresa.controller;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.empresa.dto.AuditoriaResponseDto;
import br.com.core4erp.empresa.entity.AcaoAuditoria;
import br.com.core4erp.empresa.service.AuditoriaQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/auditoria")
@RequiredArgsConstructor
public class AuditoriaController {

    private final AuditoriaQueryService auditoriaQueryService;

    @GetMapping
    @Requer("AUDITORIA_VISUALIZAR")
    public ResponseEntity<Page<AuditoriaResponseDto>> listar(
            @RequestParam(required = false) String entidade,
            @RequestParam(required = false) Long entidadeId,
            @RequestParam(required = false) AcaoAuditoria acao,
            @RequestParam(required = false) Long usuarioId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataInicio,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dataFim,
            @PageableDefault(size = 50, sort = "timestamp", direction = Sort.Direction.DESC) Pageable pageable) {

        return ResponseEntity.ok(
            auditoriaQueryService.filtrar(entidade, entidadeId, acao, usuarioId, dataInicio, dataFim, pageable)
        );
    }
}
