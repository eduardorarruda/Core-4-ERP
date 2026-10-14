package br.com.core4erp.config.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class ClientIpResolverTest {

    private static MockHttpServletRequest req() {
        MockHttpServletRequest r = new MockHttpServletRequest();
        r.setRemoteAddr("10.0.0.5");
        r.addHeader("X-Forwarded-For", "1.2.3.4, 10.0.0.1");
        return r;
    }

    @Test
    void semProxyConfiavel_ignoraCabecalhos() {
        MockHttpServletRequest r = req();
        r.addHeader("CF-Connecting-IP", "8.8.8.8");
        assertThat(new ClientIpResolver(false).resolver(r)).isEqualTo("10.0.0.5");
    }

    @Test
    void comProxy_usaCfConnectingIpPrimeiro() {
        MockHttpServletRequest r = req();
        r.addHeader("CF-Connecting-IP", "8.8.8.8");
        r.addHeader("X-Real-IP", "9.9.9.9");
        assertThat(new ClientIpResolver(true).resolver(r)).isEqualTo("8.8.8.8");
    }

    @Test
    void comProxy_semCf_usaXRealIp() {
        MockHttpServletRequest r = req();
        r.addHeader("X-Real-IP", "9.9.9.9");
        assertThat(new ClientIpResolver(true).resolver(r)).isEqualTo("9.9.9.9");
    }

    @Test
    void comProxy_nuncaUsaXForwardedForMaisAEsquerda() {
        assertThat(new ClientIpResolver(true).resolver(req())).isEqualTo("10.0.0.5");
    }

    @Test
    void comProxy_cabecalhoMalformado_caiParaRemoteAddr() {
        MockHttpServletRequest r = req();
        r.addHeader("CF-Connecting-IP", "1.2.3.4, 5.6.7.8");
        r.addHeader("X-Real-IP", "<script>");
        assertThat(new ClientIpResolver(true).resolver(r)).isEqualTo("10.0.0.5");
    }
}
