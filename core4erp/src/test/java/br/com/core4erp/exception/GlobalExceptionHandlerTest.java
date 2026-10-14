package br.com.core4erp.exception;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class GlobalExceptionHandlerTest {

    @Test
    void resumirErroUpstream_formatoOpenAi_soTipoCodigoEMensagem() {
        String corpo = """
                {"error":{"message":"Invalid schema for function 'x'","type":"invalid_request_error",
                 "param":"tools[0]","code":"invalid_function_parameters"},
                 "prompt":"DADO SENSIVEL DO USUARIO"}
                """;
        String r = GlobalExceptionHandler.resumirErroUpstream(corpo);
        assertEquals("type=invalid_request_error code=invalid_function_parameters message=Invalid schema for function 'x'", r);
        assertFalse(r.contains("SENSIVEL"));
    }

    @Test
    void resumirErroUpstream_truncaEm300() {
        String corpo = "{\"error\":{\"type\":\"t\",\"code\":\"c\",\"message\":\"" + "m".repeat(1000) + "\"}}";
        String r = GlobalExceptionHandler.resumirErroUpstream(corpo);
        assertTrue(r.length() <= GlobalExceptionHandler.MAX_DETALHE_UPSTREAM + 1);
    }

    @Test
    void resumirErroUpstream_naoJsonOuVazio() {
        assertEquals("(sem corpo)", GlobalExceptionHandler.resumirErroUpstream(null));
        assertEquals("(sem corpo)", GlobalExceptionHandler.resumirErroUpstream("  "));
        String html = "<html>" + "x".repeat(500) + "</html>";
        assertEquals(GlobalExceptionHandler.MAX_DETALHE_UPSTREAM + 1, GlobalExceptionHandler.resumirErroUpstream(html).length());
    }
}
