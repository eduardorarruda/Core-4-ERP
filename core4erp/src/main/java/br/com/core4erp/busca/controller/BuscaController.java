package br.com.core4erp.busca.controller;

import br.com.core4erp.busca.dto.BuscaResultadoDto;
import br.com.core4erp.busca.service.BuscaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** Busca global do cabeçalho: GET /api/busca?q=termo */
@RestController
@RequestMapping("/api/busca")
public class BuscaController {

    private final BuscaService buscaService;

    public BuscaController(BuscaService buscaService) {
        this.buscaService = buscaService;
    }

    @GetMapping
    public ResponseEntity<List<BuscaResultadoDto>> buscar(@RequestParam(value = "q", required = false) String q) {
        return ResponseEntity.ok(buscaService.buscar(q));
    }
}
