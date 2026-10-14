package br.com.core4erp.utils;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PlanilhaUtilsTest {

    @ParameterizedTest
    @ValueSource(strings = {"=HYPERLINK(\"http://x\")", "+1+1", "-2+3", "@SUM(A1)", "\tcmd", "\rcmd"})
    void textoSeguro_prefixaApostrofoEmGatilhosDeFormula(String perigoso) {
        assertEquals("'" + perigoso, PlanilhaUtils.textoSeguro(perigoso));
    }

    @Test
    void textoSeguro_textoNormalInalteradoENuloVazio() {
        assertEquals("Aluguel", PlanilhaUtils.textoSeguro("Aluguel"));
        assertEquals("a=b", PlanilhaUtils.textoSeguro("a=b"));
        assertEquals("", PlanilhaUtils.textoSeguro((String) null));
        assertEquals("", PlanilhaUtils.textoSeguro((Object) null));
        assertEquals("'=1", PlanilhaUtils.textoSeguro((Object) new StringBuilder("=1")));
    }
}
