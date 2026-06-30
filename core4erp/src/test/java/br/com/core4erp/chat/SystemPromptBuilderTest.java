package br.com.core4erp.chat;

import br.com.core4erp.chat.service.SystemPromptBuilder;
import br.com.core4erp.usuario.entity.Usuario;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class SystemPromptBuilderTest {

    private final SystemPromptBuilder builder = new SystemPromptBuilder();

    @Test
    void build_incluiContextoDoUsuario() {
        Usuario usuario = new Usuario();
        usuario.setNome("Maria Silva");
        usuario.setEmail("maria@core4erp.com");

        String prompt = builder.build(usuario);

        assertTrue(prompt.contains("C4 Assistant"));
        assertTrue(prompt.contains("Maria Silva"));
        assertTrue(prompt.contains("maria@core4erp.com"));
        assertTrue(prompt.contains("BRL"));
    }

    @Test
    void build_incluiRegrasDeSeguranca() {
        Usuario usuario = new Usuario();
        usuario.setNome("Joao");
        usuario.setEmail("joao@core4erp.com");

        String prompt = builder.build(usuario);

        // Seção de regras invioláveis (anti-invenção/segurança) + política de confirmação.
        assertTrue(prompt.contains("REGRAS INVIOLÁVEIS"));
        assertTrue(prompt.contains("NUNCA invente dados"));
        assertTrue(prompt.contains("confirmação"));
    }
}
