package br.com.core4erp.utils;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UtilsTest {

    @Test
    void cpf_validoComOuSemMascara() {
        assertTrue(Utils.isValidCPF("529.982.247-25"));
        assertTrue(Utils.isValidCPF("52998224725"));
    }

    @Test
    void cpf_invalido() {
        assertFalse(Utils.isValidCPF("52998224724"));
        assertFalse(Utils.isValidCPF("11111111111"));
        assertFalse(Utils.isValidCPF("123"));
        assertFalse(Utils.isValidCPF(null));
    }

    @Test
    void cnpj_validoEInvalido() {
        assertTrue(Utils.isValidCNPJ("11.222.333/0001-81"));
        assertTrue(Utils.isValidCNPJ("11222333000181"));
        assertFalse(Utils.isValidCNPJ("11222333000180"));
        assertFalse(Utils.isValidCNPJ("00000000000000"));
        assertFalse(Utils.isValidCNPJ(""));
    }
}
