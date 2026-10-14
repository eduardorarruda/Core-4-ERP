package br.com.core4erp.chat.service;

import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** Contrato 2 (n8n/CONTRATOS.md): o WF-DOC devolve {ok, texto}; o backend indexa uma única vez. */
class ChatAnexoServiceN8nContratoTest {

    private static final String ORIGINAL = "conteúdo   original\n\n\n";

    @Test
    void respostaOk_usaTextoPreprocessado() {
        assertThat(ChatAnexoService.textoPreprocessado(Map.of("ok", true, "texto", "limpo", "chars", 5), ORIGINAL))
                .isEqualTo("limpo");
    }

    @Test
    void respostaOkFalse_usaOriginal() {
        assertThat(ChatAnexoService.textoPreprocessado(Map.of("ok", false, "erro", "empresaId obrigatório"), ORIGINAL))
                .isEqualTo(ORIGINAL);
    }

    @Test
    void contratoAntigoComChunks_usaOriginal() {
        assertThat(ChatAnexoService.textoPreprocessado(Map.of("ok", true, "chunks", 7), ORIGINAL))
                .isEqualTo(ORIGINAL);
    }

    @Test
    void semCorpoOuTextoVazio_usaOriginal() {
        assertThat(ChatAnexoService.textoPreprocessado(null, ORIGINAL)).isEqualTo(ORIGINAL);
        Map<String, Object> vazio = new HashMap<>();
        vazio.put("ok", true);
        vazio.put("texto", "  ");
        assertThat(ChatAnexoService.textoPreprocessado(vazio, ORIGINAL)).isEqualTo(ORIGINAL);
    }
}
