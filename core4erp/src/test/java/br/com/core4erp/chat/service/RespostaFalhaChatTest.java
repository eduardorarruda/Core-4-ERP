package br.com.core4erp.chat.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RespostaFalhaChatTest {

    @Test
    void textoPara_rateLimitNaCausa_pedeParaAguardar() {
        RuntimeException erro = new RuntimeException("falhou", new IllegalStateException("HTTP 429 Too Many Requests"));

        assertThat(RespostaFalhaChat.textoPara(erro)).isEqualTo(RespostaFalhaChat.TEXTO_LIMITE);
    }

    @Test
    void textoPara_outrosErros_textoPadraoSemDetalheTecnico() {
        String texto = RespostaFalhaChat.textoPara(new RuntimeException("Format specifier '% e'"));

        assertThat(texto).isEqualTo(RespostaFalhaChat.TEXTO_PADRAO).doesNotContain("Format");
        assertThat(RespostaFalhaChat.textoPara(null)).isEqualTo(RespostaFalhaChat.TEXTO_PADRAO);
    }

    @Test
    void ehMarcador_reconheceSoOsTextosFixos() {
        assertThat(RespostaFalhaChat.ehMarcador(RespostaFalhaChat.TEXTO_PADRAO)).isTrue();
        assertThat(RespostaFalhaChat.ehMarcador(" " + RespostaFalhaChat.TEXTO_LIMITE + "\n")).isTrue();
        assertThat(RespostaFalhaChat.ehMarcador("Seu saldo é R$ 10,00.")).isFalse();
        assertThat(RespostaFalhaChat.ehMarcador(null)).isFalse();
    }
}
