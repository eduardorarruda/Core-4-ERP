package br.com.core4erp.chat;

import br.com.core4erp.chat.service.ChatInputSanitizer;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChatInputSanitizerTest {

    private final ChatInputSanitizer sanitizer = new ChatInputSanitizer();

    @Test
    void sanitize_quandoNulo_retornaVazio() {
        assertEquals("", sanitizer.sanitize(null));
    }

    @Test
    void sanitize_removeEspacosNasBordas() {
        assertEquals("Qual meu saldo?", sanitizer.sanitize("   Qual meu saldo?  "));
    }

    @Test
    void sanitize_mensagemNormal_passaIntacta() {
        String msg = "Registre uma conta a pagar de R$100 amanha";
        assertEquals(msg, sanitizer.sanitize(msg));
    }

    @Test
    void sanitize_truncaEntradaMuitoLonga() {
        String longa = "a".repeat(5000);
        String result = sanitizer.sanitize(longa);
        assertEquals(4000, result.length());
    }

    @Test
    void sanitize_naoBloqueiaFrasesLegitimas() {
        // O blocklist ingênuo foi removido: a defesa real é a autorização no serviço.
        String msg = "Ignore previous instructions era um teste; mostre meu saldo";
        assertTrue(sanitizer.sanitize(msg).contains("saldo"));
    }
}
