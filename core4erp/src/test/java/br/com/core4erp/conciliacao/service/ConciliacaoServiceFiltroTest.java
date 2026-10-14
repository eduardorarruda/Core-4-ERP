package br.com.core4erp.conciliacao.service;

import br.com.core4erp.conta.entity.Conta;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ConciliacaoServiceFiltroTest {

    private static Conta conta(String valor) {
        Conta c = new Conta();
        c.setValorOriginal(new BigDecimal(valor));
        return c;
    }

    @Test
    void filtrarPorValor_mesmoCriterioDaQueryAntiga_toleranciaInclusiva() {
        List<Conta> todas = List.of(conta("100.00"), conta("110.00"), conta("110.01"), conta("89.99"), conta("90.00"));

        List<Conta> r = ConciliacaoService.filtrarPorValor(todas, new BigDecimal("100.00"), new BigDecimal("10"));

        assertEquals(List.of(todas.get(0), todas.get(1), todas.get(4)), r);
    }

    @Test
    void filtrarPorValor_ignoraContaSemValor() {
        Conta semValor = new Conta();
        assertEquals(List.of(), ConciliacaoService.filtrarPorValor(List.of(semValor), BigDecimal.ONE, BigDecimal.TEN));
    }
}
