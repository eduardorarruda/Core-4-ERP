package br.com.core4erp.conciliacaoCartao.service;

import br.com.core4erp.cartaoCredito.entity.LancamentoCartao;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ConciliacaoCartaoServiceFiltroTest {

    private static LancamentoCartao lanc(LocalDate data) {
        LancamentoCartao l = new LancamentoCartao();
        l.setDataCompra(data);
        return l;
    }

    @Test
    void filtrarPorJanela_inclusivaNasPontas() {
        LocalDate base = LocalDate.of(2026, 5, 10);
        LancamentoCartao antes = lanc(base.minusDays(8));
        LancamentoCartao inicio = lanc(base.minusDays(7));
        LancamentoCartao meio = lanc(base);
        LancamentoCartao fim = lanc(base.plusDays(7));
        LancamentoCartao depois = lanc(base.plusDays(8));
        LancamentoCartao semData = lanc(null);

        List<LancamentoCartao> r = ConciliacaoCartaoService.filtrarPorJanela(
                List.of(antes, inicio, meio, fim, depois, semData), base.minusDays(7), base.plusDays(7));

        assertEquals(List.of(inicio, meio, fim), r);
    }
}
