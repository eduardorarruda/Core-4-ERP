package br.com.core4erp.exception;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Erros de requisição do cliente viram 4xx com o JSON padrão — nunca 500 + log ERROR. */
class GlobalExceptionHandlerRequisicaoInvalidaTest {

    @RestController
    static class ControllerFalso {
        @PostMapping("/api/teste")
        Map<String, Object> criar(@RequestBody Map<String, Object> corpo) {
            return corpo;
        }

        @GetMapping("/api/teste/{id}")
        Long buscar(@PathVariable Long id) {
            return id;
        }

        @GetMapping("/api/teste")
        String listar(@RequestParam String filtro) {
            return filtro;
        }

        @GetMapping("/api/teste-formato")
        String formatoInvalido(@RequestParam String texto) {
            return texto.formatted(); // texto dinâmico como string de formato: bug de servidor simulado
        }
    }

    private final MockMvc mvc = MockMvcBuilders.standaloneSetup(new ControllerFalso())
            .setControllerAdvice(new GlobalExceptionHandler())
            .build();

    @Test
    void illegalFormatException_naoViraFormatSpecifier400() throws Exception {
        // IllegalFormatException estende IllegalArgumentException; o handler específico vence e
        // devolve erro interno amigável (nunca 400 com "Format specifier '% e'").
        mvc.perform(get("/api/teste-formato").param("texto", "subiu 50% e caiu"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.codigo").value("ERRO_INTERNO"))
                .andExpect(jsonPath("$.mensagem").value("Não foi possível concluir sua solicitação agora. Tente novamente."));
    }

    @Test
    void jsonMalformado_400RequisicaoInvalida() throws Exception {
        mvc.perform(post("/api/teste").contentType(MediaType.APPLICATION_JSON).content("{\"a\":"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REQUISICAO_INVALIDA"))
                .andExpect(jsonPath("$.mensagem").isNotEmpty())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }

    @Test
    void corpoAusente_400RequisicaoInvalida() throws Exception {
        mvc.perform(post("/api/teste").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REQUISICAO_INVALIDA"));
    }

    @Test
    void parametroAusente_400() throws Exception {
        mvc.perform(get("/api/teste"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REQUISICAO_INVALIDA"));
    }

    @Test
    void idNaoNumerico_400() throws Exception {
        mvc.perform(get("/api/teste/abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.codigo").value("REQUISICAO_INVALIDA"));
    }

    @Test
    void metodoNaoSuportado_405ComAllow() throws Exception {
        mvc.perform(delete("/api/teste"))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(header().exists("Allow"))
                .andExpect(jsonPath("$.codigo").value("METODO_NAO_SUPORTADO"));
    }

    @Test
    void contentTypeNaoSuportado_415() throws Exception {
        mvc.perform(post("/api/teste").contentType(MediaType.TEXT_PLAIN).content("x"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.codigo").value("FORMATO_NAO_SUPORTADO"));
    }

    @Test
    void rotaInexistente_404() throws Exception {
        mvc.perform(get("/api/nao-existe"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.codigo").value("RECURSO_NAO_ENCONTRADO"));
    }
}
