package br.com.core4erp.config.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.spec.ECGenParameterSpec;
import java.util.Base64;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private static final String SEGREDO_64 = "x".repeat(64);
    private static final long UMA_HORA = 3_600_000L;

    static String pem(String tipo, byte[] der) {
        return "-----BEGIN " + tipo + "-----\n"
                + Base64.getMimeEncoder(64, "\n".getBytes()).encodeToString(der)
                + "\n-----END " + tipo + "-----";
    }

    static KeyPair ed25519() throws Exception {
        return KeyPairGenerator.getInstance("Ed25519").generateKeyPair();
    }

    static KeyPair ec(String curva) throws Exception {
        KeyPairGenerator g = KeyPairGenerator.getInstance("EC");
        g.initialize(new ECGenParameterSpec(curva));
        return g.generateKeyPair();
    }

    static JwtService hmac() {
        return new JwtService(SEGREDO_64, UMA_HORA, "", "", new MockEnvironment());
    }

    static JwtService assimetrico(KeyPair kp) {
        return new JwtService("", UMA_HORA,
                pem("PRIVATE KEY", kp.getPrivate().getEncoded()),
                pem("PUBLIC KEY", kp.getPublic().getEncoded()),
                new MockEnvironment());
    }

    @Test
    void hmac_fallback_geraTokenComClaimsTvJtiIat() {
        JwtService jwt = hmac();
        String token = jwt.generateToken("a@b.com", 3);

        JwtService.DadosToken dados = jwt.validar(token);
        assertThat(dados).isNotNull();
        assertThat(dados.email()).isEqualTo("a@b.com");
        assertThat(dados.tokenVersion()).isEqualTo(3);
        assertThat(dados.jti()).isNotBlank();
        assertThat(jwt.getAlgoritmo()).isEqualTo("HS512");
        // jti único por emissão
        assertThat(jwt.validar(jwt.generateToken("a@b.com", 3)).jti()).isNotEqualTo(dados.jti());
    }

    @Test
    void ed25519_assinaEValida() throws Exception {
        JwtService jwt = assimetrico(ed25519());
        assertThat(jwt.getAlgoritmo()).isEqualTo("EdDSA");
        assertThat(jwt.validar(jwt.generateToken("a@b.com", 0)).email()).isEqualTo("a@b.com");
    }

    @Test
    void es256_assinaEValida() throws Exception {
        JwtService jwt = assimetrico(ec("secp256r1"));
        assertThat(jwt.getAlgoritmo()).isEqualTo("ES256");
        assertThat(jwt.isTokenValid(jwt.generateToken("a@b.com", 1))).isTrue();
    }

    @Test
    void ecForaDaCurvaP256_falhaNoBoot() throws Exception {
        KeyPair kp = ec("secp384r1");
        assertThatThrownBy(() -> assimetrico(kp)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void semSegredoESemParDeChaves_falhaNoBoot() {
        assertThatThrownBy(() -> new JwtService("", UMA_HORA, "", "", new MockEnvironment()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void confusaoDeAlgoritmo_tokenHs256ComChavePublicaComoSegredo_rejeitado() throws Exception {
        KeyPair kp = ed25519();
        JwtService jwt = assimetrico(kp);
        String forjado = Jwts.builder().subject("vitima@b.com")
                .claim("tv", 0)
                .signWith(Keys.hmacShaKeyFor(kp.getPublic().getEncoded()), Jwts.SIG.HS256)
                .compact();
        assertThat(jwt.validar(forjado)).isNull();
    }

    @Test
    void tokenDeOutroParDeChaves_rejeitado() throws Exception {
        String deOutro = assimetrico(ed25519()).generateToken("a@b.com", 0);
        assertThat(assimetrico(ed25519()).validar(deOutro)).isNull();
    }

    @Test
    void tokenHmacQuandoServidorUsaEd25519_rejeitado() throws Exception {
        String hs = hmac().generateToken("a@b.com", 0);
        assertThat(assimetrico(ed25519()).validar(hs)).isNull();
    }

    @Test
    void tokenSemAssinatura_algNone_rejeitado() {
        String none = Jwts.builder().subject("a@b.com").compact();
        assertThat(hmac().validar(none)).isNull();
    }

    @Test
    void tokenExpirado_rejeitado() {
        JwtService expirado = new JwtService(SEGREDO_64, -1_000L, "", "", new MockEnvironment());
        assertThat(expirado.validar(expirado.generateToken("a@b.com", 0))).isNull();
    }

    @Test
    void tokenLegadoSemTv_tratadoComoVersaoZero() {
        String legado = Jwts.builder().subject("a@b.com")
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + UMA_HORA))
                .signWith(Keys.hmacShaKeyFor(SEGREDO_64.getBytes()), Jwts.SIG.HS512)
                .compact();
        assertThat(hmac().validar(legado).tokenVersion()).isZero();
    }

    @Test
    void lixoOuNulo_retornaNull() {
        assertThat(hmac().validar(null)).isNull();
        assertThat(hmac().validar("abc.def.ghi")).isNull();
        assertThat(hmac().extractEmail("abc")).isNull();
    }

    @Test
    void producaoComHmac_continuaFuncionando() {
        MockEnvironment prod = new MockEnvironment();
        prod.setActiveProfiles("prod");
        JwtService jwt = new JwtService(SEGREDO_64, UMA_HORA, "", "", prod);
        assertThat(jwt.isTokenValid(jwt.generateToken("a@b.com", 0))).isTrue();
    }
}
