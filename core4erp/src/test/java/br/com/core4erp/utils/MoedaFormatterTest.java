package br.com.core4erp.utils;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class MoedaFormatterTest {

    @Test
    void formataPadraoBrasileiro() {
        assertThat(MoedaFormatter.formatar(new BigDecimal("1234.5"))).isEqualTo("R$ 1.234,50");
        assertThat(MoedaFormatter.formatar(new BigDecimal("0.005"))).isEqualTo("R$ 0,01");
        assertThat(MoedaFormatter.formatar(new BigDecimal("-10"))).isEqualTo("-R$ 10,00");
        assertThat(MoedaFormatter.formatar(null)).isEqualTo("R$ 0,00");
    }
}
