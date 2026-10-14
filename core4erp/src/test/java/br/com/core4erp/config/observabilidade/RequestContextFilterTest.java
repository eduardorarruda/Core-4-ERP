package br.com.core4erp.config.observabilidade;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

class RequestContextFilterTest {

    @AfterEach
    void limpar() {
        MDC.clear();
    }

    @Test
    void requestId_seguroRecebido_eReaproveitadoEEcoado() throws Exception {
        RequestContextFilter filtro = new RequestContextFilter("false");
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/contas");
        req.addHeader("X-Request-Id", "3f2c9a1e-7b6d-4c1a-9e8f-1a2b3c4d5e6f");
        MockHttpServletResponse resp = new MockHttpServletResponse();
        AtomicReference<String> noMdc = new AtomicReference<>();

        filtro.doFilter(req, resp, (rq, rs) -> noMdc.set(MDC.get("requestId")));

        assertEquals("3f2c9a1e-7b6d-4c1a-9e8f-1a2b3c4d5e6f", noMdc.get());
        assertEquals("3f2c9a1e-7b6d-4c1a-9e8f-1a2b3c4d5e6f", resp.getHeader("X-Request-Id"));
    }

    @Test
    void requestId_inseguro_eSubstituidoPorUuid() {
        String gerado = RequestContextFilter.resolverRequestId("abc\r\nInjetado: sim");
        assertNotEquals("abc\r\nInjetado: sim", gerado);
        assertTrue(gerado.matches("[0-9a-f-]{36}"));
        assertTrue(RequestContextFilter.resolverRequestId("curto").matches("[0-9a-f-]{36}"));
        assertTrue(RequestContextFilter.resolverRequestId(null).matches("[0-9a-f-]{36}"));
        assertTrue(RequestContextFilter.resolverRequestId("x".repeat(65)).matches("[0-9a-f-]{36}"));
    }

    @Test
    void ip_semProxyConfiavel_ignoraHeadersForjaveis() {
        RequestContextFilter filtro = new RequestContextFilter("false");
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr("10.0.0.5");
        req.addHeader("CF-Connecting-IP", "1.2.3.4");
        req.addHeader("X-Real-IP", "5.6.7.8");
        assertEquals("10.0.0.5", filtro.resolverIp(req));
    }

    @Test
    void ip_comProxyConfiavel_prioridadeCloudflareDepoisRealIp() {
        RequestContextFilter filtro = new RequestContextFilter("true");
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr("172.18.0.3");
        req.addHeader("CF-Connecting-IP", "203.0.113.7");
        req.addHeader("X-Real-IP", "198.51.100.2");
        assertEquals("203.0.113.7", filtro.resolverIp(req));

        MockHttpServletRequest semCf = new MockHttpServletRequest();
        semCf.setRemoteAddr("172.18.0.3");
        semCf.addHeader("X-Real-IP", "2001:db8::1");
        assertEquals("2001:db8::1", filtro.resolverIp(semCf));
    }

    @Test
    void ip_headerInvalido_caiNoRemoteAddr() {
        RequestContextFilter filtro = new RequestContextFilter("true");
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr("172.18.0.3");
        req.addHeader("CF-Connecting-IP", "1.2.3.4\r\nX: y");
        assertEquals("172.18.0.3", filtro.resolverIp(req));
    }

    @Test
    void mdc_limpoAoFinal_mesmoComFiltroInternoLimpando() throws Exception {
        RequestContextFilter filtro = new RequestContextFilter("false");
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/x");
        FilterChain interno = (rq, rs) -> MDC.clear(); // como JwtFilter/TenantFilter fazem hoje

        filtro.doFilter(req, new MockHttpServletResponse(), interno);

        assertNull(MDC.get("requestId"));
        assertNull(MDC.get("ip"));
    }

    @Test
    void mdc_limpoMesmoQuandoACadeiaLancaExcecao() {
        RequestContextFilter filtro = new RequestContextFilter("false");
        MockHttpServletRequest req = new MockHttpServletRequest("GET", "/api/x");
        try {
            filtro.doFilter(req, new MockHttpServletResponse(), (rq, rs) -> {
                throw new IllegalStateException("falha");
            });
        } catch (Exception esperado) {
            // a exceção deve propagar; o que importa é o MDC limpo
        }
        assertNull(MDC.get("requestId"));
    }
}
