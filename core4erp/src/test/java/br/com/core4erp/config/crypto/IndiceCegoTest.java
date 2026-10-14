package br.com.core4erp.config.crypto;

import br.com.core4erp.cartaoCredito.entity.CartaoCredito;
import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import br.com.core4erp.empresa.entity.Empresa;
import br.com.core4erp.parceiro.entity.Parceiro;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

class IndiceCegoTest {

    @BeforeEach
    void setUp() {
        CryptoTestKeys.inicializar();
    }

    @Test
    void documento_comOuSemMascara_geraMesmoIndice() {
        assertEquals(IndiceCego.documento("12.345.678/0001-95"), IndiceCego.documento("12345678000195"));
        assertEquals(IndiceCego.documento("529.982.247-25"), IndiceCego.documento(" 52998224725 "));
    }

    @Test
    void documento_semDigitos_semIndice() {
        assertNull(IndiceCego.documento(null));
        assertNull(IndiceCego.documento(""));
        assertNull(IndiceCego.documento("abc"));
    }

    @Test
    void numeroConta_normalizaBordasEMaiusculas_eSeparaDominioDoDocumento() {
        assertEquals(IndiceCego.numeroConta(" 12345-x "), IndiceCego.numeroConta("12345-X"));
        assertNull(IndiceCego.numeroConta("  "));
        // mesmo texto em domínios diferentes não colide (prefixos doc:/conta:)
        assertNotEquals(IndiceCego.numeroConta("52998224725"), IndiceCego.documento("52998224725"));
    }

    @Test
    void setters_mantemIndiceSincronizado() {
        Parceiro p = new Parceiro();
        p.setCpfCnpj("52998224725");
        assertEquals(IndiceCego.documento("52998224725"), p.getCpfCnpjHash());
        p.setCpfCnpj(null);
        assertNull(p.getCpfCnpjHash());

        Empresa e = new Empresa();
        e.setCnpj("12.345.678/0001-95");
        assertEquals(IndiceCego.documento("12345678000195"), e.getCnpjHash());

        ContaCorrente cc = new ContaCorrente();
        cc.setNumeroConta("98765-4");
        assertNotNull(cc.getNumeroContaHash());
        assertEquals(IndiceCego.numeroConta("98765-4"), cc.getNumeroContaHash());
    }

    @Test
    void acctIdCartao_normalizaEUsaDominioProprio() {
        assertEquals(IndiceCego.acctIdCartao(" 4111abc "), IndiceCego.acctIdCartao("4111ABC"));
        assertNull(IndiceCego.acctIdCartao(" "));
        assertNotEquals(IndiceCego.acctIdCartao("12345"), IndiceCego.numeroConta("12345"));
    }

    @Test
    void cartaoCredito_setAcctIdOfx_sincronizaIndice() {
        CartaoCredito cartao = new CartaoCredito();
        cartao.setAcctIdOfx("4111ABC");
        assertEquals(IndiceCego.acctIdCartao("4111ABC"), cartao.getAcctIdOfxHash());
        cartao.setAcctIdOfx(null);
        assertNull(cartao.getAcctIdOfxHash());
    }
}
