package br.com.core4erp.chat.config;

import br.com.core4erp.exception.AcessoNegadoException;
import org.junit.jupiter.api.Test;
import org.springframework.ai.tool.definition.DefaultToolDefinition;
import org.springframework.ai.tool.execution.ToolExecutionException;

import static org.assertj.core.api.Assertions.assertThat;

class ChatToolErrorConfigTest {

    private static ToolExecutionException falha(String tool, Throwable causa) {
        return new ToolExecutionException(new DefaultToolDefinition(tool, "descrição", "{}"), causa);
    }

    @Test
    void semPermissao_naoVazaCodigoDaPermissao() {
        String resposta = ChatToolErrorConfigTestAccess.processar(
                falha("excluirConta", new AcessoNegadoException("Permissão necessária: CONTA_DELETAR")));

        assertThat(resposta)
                .contains("não tem permissão")
                .contains("administrador")
                .doesNotContain("CONTA_DELETAR");
    }

    @Test
    void falhaComum_mantemMensagemEInstrucaoAntiLoop() {
        String resposta = ChatToolErrorConfigTestAccess.processar(
                falha("atualizarParceiro", new IllegalArgumentException("CNPJ inválido")));

        assertThat(resposta)
                .contains("atualizarParceiro")
                .contains("CNPJ inválido")
                .contains("NÃO chame esta ferramenta novamente");
    }
}
