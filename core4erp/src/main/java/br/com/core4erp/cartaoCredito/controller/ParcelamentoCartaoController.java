package br.com.core4erp.cartaoCredito.controller;

import br.com.core4erp.cartaoCredito.dto.ParcelamentoResponseDto;
import br.com.core4erp.cartaoCredito.service.ParcelamentoCartaoService;
import br.com.core4erp.config.rbac.Requer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Cartões de Crédito")
@RestController
@RequestMapping("/api/cartoes/parcelamentos")
public class ParcelamentoCartaoController {

    private final ParcelamentoCartaoService parcelamentoService;

    public ParcelamentoCartaoController(ParcelamentoCartaoService parcelamentoService) {
        this.parcelamentoService = parcelamentoService;
    }

    @Operation(summary = "Compras parceladas ativas (parcela k de n, quanto falta, próximas parcelas)")
    @GetMapping
    @Requer("CARTAO_VISUALIZAR")
    public ResponseEntity<List<ParcelamentoResponseDto>> listar() {
        return ResponseEntity.ok(parcelamentoService.listarAtivos());
    }
}
