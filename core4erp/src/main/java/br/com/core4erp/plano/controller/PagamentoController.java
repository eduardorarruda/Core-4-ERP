package br.com.core4erp.plano.controller;

import br.com.core4erp.plano.dto.PagarPlanoRequestDto;
import br.com.core4erp.plano.dto.PagamentoResponseDto;
import br.com.core4erp.plano.service.PagamentoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Pagamentos", description = "Simulação de pagamento de planos (mock)")
@RestController
@RequestMapping("/api/pagamentos")
@RequiredArgsConstructor
public class PagamentoController {

    private final PagamentoService pagamentoService;

    @Operation(summary = "Ativar plano via pagamento mock")
    @PostMapping
    public ResponseEntity<PagamentoResponseDto> pagar(
            @Valid @RequestBody PagarPlanoRequestDto dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(pagamentoService.pagar(dto));
    }

    @Operation(summary = "Histórico de pagamentos da empresa")
    @GetMapping("/historico")
    public ResponseEntity<Page<PagamentoResponseDto>> historico(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(pagamentoService.historico(pageable));
    }
}
