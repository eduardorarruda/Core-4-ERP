package br.com.core4erp.chat.service;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConfirmacaoUsuarioTest {

    @ParameterizedTest
    @ValueSource(strings = {"sim", "Sim!", "SIM.", "s", "confirmo", "Confirmar", "pode", "Pode excluir",
            "ok", "OK, pode fazer", "isso mesmo", "sim, pode transferir para a conta Itaú", "claro",
            "prossiga", "pode ser", "  sim  "})
    void confirmacoesExplicitas(String mensagem) {
        assertTrue(ConfirmacaoUsuario.isConfirmacaoExplicita(mensagem), mensagem);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"não", "nao", "Não, cancela", "sim, não, espera", "pode não", "cancelar",
            "espera", "pode?", "exclua a conta 5", "qual meu saldo", "isso está errado",
            "sim mas antes me mostra o saldo",
            "ok ok ok ok ok ok ok ok ok ok ok ok ok ok ok ok", "   "})
    void naoSaoConfirmacao(String mensagem) {
        assertFalse(ConfirmacaoUsuario.isConfirmacaoExplicita(mensagem), String.valueOf(mensagem));
    }
}
