package br.com.core4erp.chat.service;

import br.com.core4erp.usuario.entity.Usuario;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * Regressão do 400 "Format specifier '% e'": texto dinâmico com "%" (mensagem do usuário, nome,
 * trechos do RAG, conteúdo de anexo, valores como "50% a mais") NUNCA pode ser usado como string de
 * formato. Os montadores de prompt usam concatenação e preservam o texto literalmente.
 */
class TextoComPercentualPromptTest {

    @ParameterizedTest
    @ValueSource(strings = {"%", "% e", "100%", "%s", "50% a mais", "75% a mais e 10% e", "%d %n %%", "%1$s %-%"})
    void systemPrompt_nomeComPercentual_preservadoSemErro(String texto) {
        Usuario usuario = new Usuario();
        usuario.setNome(texto);
        usuario.setEmail("a@b.com");

        String prompt = new SystemPromptBuilder().build(usuario, true);

        assertThat(prompt).contains("- Usuário: " + texto + " (email: a@b.com)")
                .contains("- Data de hoje: ")
                .contains("## PENSAMENTO ESTENDIDO");
    }

    @ParameterizedTest
    @ValueSource(strings = {"%", "% e", "100%", "%s", "gastei 50% a mais", "%d %n %%"})
    void blocoRag_trechoComPercentual_preservadoSemErro(String trecho) {
        String bloco = RagService.montarBlocoReferencia(List.of(trecho, "outro " + trecho));

        assertThat(bloco).contains("<material_referencia_nao_confiavel>\n" + trecho + "\n</material_referencia_nao_confiavel>")
                .contains("outro " + trecho)
                .startsWith("## MATERIAL DE REFERÊNCIA (RAG)");
    }

    @ParameterizedTest
    @ValueSource(strings = {"%", "% e", "100%", "%s", "cadastre 50% a mais", "%d %n %%"})
    void promptAnexo_instrucaoNomeEConteudoComPercentual_preservadosSemErro(String texto) {
        String documento = new ChatInputSanitizer().envolverDocumento("linha " + texto, 1000);

        String prompt = ChatAnexoService.montarPromptAnexo(texto, "extrato " + texto + ".csv", "csv", "", documento);

        assertThat(prompt).contains("\"" + texto + "\"\n\nArquivo: \"extrato " + texto + ".csv\" (tipo: csv)\n\n")
                .contains("linha " + texto)
                .contains("Tarefa: cumpra a INSTRUÇÃO DO USUÁRIO");
    }

    @ParameterizedTest
    @ValueSource(strings = {"% e", "%s", "100%"})
    void sanitizer_naoInterpretaPercentual(String texto) {
        assertThatCode(() -> new ChatInputSanitizer().sanitize("quanto gastei " + texto + "?"))
                .doesNotThrowAnyException();
        assertThat(new ChatInputSanitizer().sanitize("quanto gastei " + texto + "?"))
                .isEqualTo("quanto gastei " + texto + "?");
    }
}
