package br.com.core4erp.utils;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

/**
 * Testes unitários puros (sem Spring, sem banco) para a lógica de parcelamento.
 */
class ParcelamentoHelperTest {

    @Test
    void normalizarParcelas_quandoNuloOuInvalido_retornaUm() {
        assertEquals(1, ParcelamentoHelper.normalizarParcelas(null));
        assertEquals(1, ParcelamentoHelper.normalizarParcelas(0));
        assertEquals(1, ParcelamentoHelper.normalizarParcelas(-5));
    }

    @Test
    void normalizarParcelas_quandoValido_mantemValor() {
        assertEquals(3, ParcelamentoHelper.normalizarParcelas(3));
    }

    @Test
    void normalizarIntervalo_quandoNuloOuInvalido_retornaUm() {
        assertEquals(1, ParcelamentoHelper.normalizarIntervalo(null));
        assertEquals(1, ParcelamentoHelper.normalizarIntervalo(0));
    }

    @Test
    void normalizarIntervalo_quandoValido_mantemValor() {
        assertEquals(2, ParcelamentoHelper.normalizarIntervalo(2));
    }

    @Test
    void calcularValorPorParcela_quandoDivide_arredondaEmDuasCasas() {
        BigDecimal resultado = ParcelamentoHelper.calcularValorPorParcela(new BigDecimal("100.00"), 3, true);
        assertEquals(0, new BigDecimal("33.33").compareTo(resultado));
    }

    @Test
    void calcularValorPorParcela_quandoNaoDivide_retornaValorTotal() {
        BigDecimal valorTotal = new BigDecimal("100.00");
        assertEquals(0, valorTotal.compareTo(ParcelamentoHelper.calcularValorPorParcela(valorTotal, 1, true)));
        assertEquals(0, valorTotal.compareTo(ParcelamentoHelper.calcularValorPorParcela(valorTotal, 3, false)));
    }

    @Test
    void gerarGrupoParcelamento_quandoParcelaUnica_retornaNulo() {
        assertNull(ParcelamentoHelper.gerarGrupoParcelamento(1));
    }

    @Test
    void gerarGrupoParcelamento_quandoMultiplasParcelas_retornaIdentificador() {
        assertNotNull(ParcelamentoHelper.gerarGrupoParcelamento(3));
    }
}
