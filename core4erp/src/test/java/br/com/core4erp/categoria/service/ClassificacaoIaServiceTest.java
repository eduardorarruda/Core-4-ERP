package br.com.core4erp.categoria.service;

import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.categoria.service.ClassificacaoIaService.SugestaoCategoria;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.client.ChatClient;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * Cobre os guardrails de {@link ClassificacaoIaService#avaliar} — a parte crítica de segurança:
 * a IA não pode escolher um id fora do catálogo do tenant, nem sugestões de baixa confiança passam.
 */
class ClassificacaoIaServiceTest {

    private final ClassificacaoIaService service =
            new ClassificacaoIaService(mock(ChatClient.Builder.class), null, null);

    private Categoria categoria(long id, String descricao) {
        Categoria c = new Categoria();
        c.setId(id);
        c.setDescricao(descricao);
        return c;
    }

    private final List<Categoria> catalogo = List.of(
            categoria(1L, "Alimentação"),
            categoria(2L, "Transporte"));

    @Test
    void idForaDoCatalogoDoTenant_retornaEmpty() {
        // Modelo devolveu um id que NÃO pertence à empresa → rejeitado (isolamento por empresa).
        var s = new SugestaoCategoria(999L, "chutou", 0.99);
        assertThat(service.avaliar(s, catalogo)).isEmpty();
    }

    @Test
    void confiancaAbaixoDoMinimo_retornaEmpty() {
        var s = new SugestaoCategoria(1L, "não tenho certeza", 0.49);
        assertThat(service.avaliar(s, catalogo)).isEmpty();
    }

    @Test
    void idNulo_retornaEmpty() {
        var s = new SugestaoCategoria(null, "sem id", 0.9);
        assertThat(service.avaliar(s, catalogo)).isEmpty();
    }

    @Test
    void sugestaoNula_retornaEmpty() {
        assertThat(service.avaliar(null, catalogo)).isEmpty();
    }

    @Test
    void idValidoEConfiancaSuficiente_retornaSugestao() {
        var s = new SugestaoCategoria(2L, "menção a Uber", 0.87);
        Optional<SugestaoCategoria> resultado = service.avaliar(s, catalogo);
        assertThat(resultado).isPresent();
        assertThat(resultado.get().categoriaId()).isEqualTo(2L);
    }
}
