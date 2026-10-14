package br.com.core4erp.config.crypto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class CriptografiaCamposTest {

    private CriptografiaCampos cripto;

    @BeforeEach
    void setUp() {
        cripto = CryptoTestKeys.inicializar();
    }

    @Test
    void cifrarEDecifrar_idaEVolta() {
        String cifrado = cripto.cifrar("12345678000195");
        assertTrue(cifrado.startsWith("v1:"));
        assertFalse(cifrado.contains("12345678000195"));
        assertEquals("12345678000195", cripto.decifrar(cifrado));
    }

    @Test
    void cifrar_ivAleatorio_mesmoValorGeraCifrasDiferentes() {
        assertNotEquals(cripto.cifrar("52998224725"), cripto.cifrar("52998224725"));
    }

    @Test
    void cifrar_cabeNaColunaVarchar255() {
        assertTrue(cripto.cifrar("12.345.678/0001-95").length() <= 255);
        assertTrue(cripto.cifrar("x".repeat(150)).length() <= 255);
    }

    @Test
    void nulos_permanecemNulos() {
        assertNull(cripto.cifrar(null));
        assertNull(cripto.decifrar(null));
        assertNull(cripto.indiceCego(null));
        assertNull(cripto.indiceCego(""));
    }

    @Test
    void decifrar_valorLegadoEmTextoPuro_eDevolvidoComoEsta() {
        assertEquals("12345678000195", cripto.decifrar("12345678000195"));
    }

    @Test
    void decifrar_dadoAdulterado_falhaSemExporValor() {
        String cifrado = cripto.cifrar("52998224725");
        byte[] bytes = Base64.getDecoder().decode(cifrado.substring(3));
        bytes[bytes.length - 1] ^= 0x01;
        String adulterado = "v1:" + Base64.getEncoder().encodeToString(bytes);

        IllegalStateException e = assertThrows(IllegalStateException.class, () -> cripto.decifrar(adulterado));
        assertFalse(e.getMessage().contains("52998224725"));
    }

    @Test
    void decifrar_comChaveDiferente_falha() {
        String cifrado = cripto.cifrar("52998224725");
        CriptografiaCampos outra = new CriptografiaCampos(CryptoTestKeys.CHAVE_HMAC, CryptoTestKeys.CHAVE_CIFRA);
        assertThrows(IllegalStateException.class, () -> outra.decifrar(cifrado));
        CryptoTestKeys.inicializar(); // restaura o holder para os demais testes
    }

    @Test
    void indiceCego_deterministicoEHex64() {
        String h1 = cripto.indiceCego("doc:52998224725");
        assertEquals(h1, cripto.indiceCego("doc:52998224725"));
        assertEquals(64, h1.length());
        assertNotEquals(h1, cripto.indiceCego("doc:52998224726"));
    }

    @Test
    void chave_ausente_falhaRapidoComOrientacao() {
        IllegalStateException e = assertThrows(IllegalStateException.class,
                () -> new CriptografiaCampos("", CryptoTestKeys.CHAVE_HMAC));
        assertTrue(e.getMessage().contains("DATA_ENCRYPTION_KEY"));
        assertTrue(e.getMessage().contains("openssl rand -base64 32"));
        assertThrows(IllegalStateException.class, () -> new CriptografiaCampos(CryptoTestKeys.CHAVE_CIFRA, null));
    }

    @Test
    void chave_tamanhoErradoOuBase64Invalido_falha() {
        String curta = Base64.getEncoder().encodeToString(new byte[16]);
        assertThrows(IllegalStateException.class, () -> new CriptografiaCampos(curta, CryptoTestKeys.CHAVE_HMAC));
        assertThrows(IllegalStateException.class, () -> new CriptografiaCampos("@@nao-base64@@", CryptoTestKeys.CHAVE_HMAC));
        CryptoTestKeys.inicializar();
    }

    @Test
    void converter_cifraAoGravarEDecifraAoLer() {
        CampoCriptografadoConverter converter = new CampoCriptografadoConverter();
        String coluna = converter.convertToDatabaseColumn("0001");
        assertTrue(coluna.startsWith("v1:"));
        assertEquals("0001", converter.convertToEntityAttribute(coluna));
        assertNull(converter.convertToDatabaseColumn(null));
        assertNull(converter.convertToEntityAttribute(null));
    }
}
