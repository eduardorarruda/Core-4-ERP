package br.com.core4erp.config.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.MacAlgorithm;
import io.jsonwebtoken.security.SecureDigestAlgorithm;
import io.jsonwebtoken.security.SignatureAlgorithm;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.Key;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.interfaces.ECKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.Date;
import java.util.UUID;

/**
 * Emissão e validação de JWT.
 *
 * <p><b>Algoritmo:</b> se {@code JWT_PRIVATE_KEY} e {@code JWT_PUBLIC_KEY} (PEM — PKCS#8 e X.509)
 * estiverem definidas, assina com criptografia assimétrica: <b>EdDSA (Ed25519)</b> ou <b>ES256</b>
 * (curva P-256), detectado pelo tipo da chave. Caso contrário, cai para HMAC com {@code SECRET_KEY}
 * (HS256/384/512 conforme o tamanho do segredo — mesmo critério que o jjwt usava antes, para não
 * invalidar tokens já emitidos) e registra WARN quando o perfil {@code prod} está ativo.
 *
 * <p><b>Sem confusão de algoritmo:</b> o parser aceita SOMENTE o algoritmo configurado
 * ({@code sig().clear().add(alg)}); um token HS256 assinado com a chave pública como segredo,
 * ou com {@code alg=none}, é rejeitado.
 *
 * <p><b>Claims:</b> {@code sub} (e-mail), {@code tv} (versão de token do usuário — revogação),
 * {@code jti} (id único), {@code iat} e {@code exp}.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    static final String CLAIM_TOKEN_VERSION = "tv";
    private static final int HS512_MIN_BYTES = 64;
    private static final int HS384_MIN_BYTES = 48;
    private static final int P256_FIELD_SIZE = 256;

    /** Dados extraídos de um token com assinatura e expiração válidas. */
    public record DadosToken(String email, int tokenVersion, String jti) {}

    private final long expiration;
    private final Key signingKey;
    private final SecureDigestAlgorithm<? super Key, ?> algoritmo;
    private final JwtParser parser;

    public JwtService(@Value("${jwt.secret:}") String secretKey,
                      @Value("${jwt.expiration}") long expiration,
                      @Value("${jwt.private-key:${JWT_PRIVATE_KEY:}}") String privateKeyPem,
                      @Value("${jwt.public-key:${JWT_PUBLIC_KEY:}}") String publicKeyPem,
                      Environment environment) {
        this.expiration = expiration;
        boolean assimetrico = !isBlank(privateKeyPem) && !isBlank(publicKeyPem);
        Key verifyKey;

        if (assimetrico) {
            ChavesAssimetricas chaves = carregarChaves(privateKeyPem, publicKeyPem);
            this.signingKey = chaves.privada();
            verifyKey = chaves.publica();
            this.algoritmo = cast(chaves.algoritmo());
            log.info("JWT configurado com assinatura assimétrica: {}", chaves.algoritmo().getId());
        } else {
            if (isBlank(secretKey)) {
                throw new IllegalStateException(
                        "Configuração de JWT ausente: defina JWT_PRIVATE_KEY/JWT_PUBLIC_KEY ou SECRET_KEY");
            }
            byte[] segredo = secretKey.getBytes(StandardCharsets.UTF_8);
            SecretKey hmac = Keys.hmacShaKeyFor(segredo);
            this.signingKey = hmac;
            verifyKey = hmac;
            this.algoritmo = cast(macPorTamanho(segredo.length));
            if (environment != null && environment.acceptsProfiles(Profiles.of("prod"))) {
                log.warn("JWT em produção usando HMAC ({}) com SECRET_KEY — configure JWT_PRIVATE_KEY e "
                        + "JWT_PUBLIC_KEY (Ed25519 ou ES256) para assinatura assimétrica.", algoritmo.getId());
            }
        }

        this.parser = construirParser(verifyKey, algoritmo);
    }

    // ── Emissão ──────────────────────────────────────────────────────────────

    public String generateToken(String email, int tokenVersion) {
        long agora = System.currentTimeMillis();
        return Jwts.builder()
                .subject(email)
                .id(UUID.randomUUID().toString())
                .claim(CLAIM_TOKEN_VERSION, tokenVersion)
                .issuedAt(new Date(agora))
                .expiration(new Date(agora + expiration))
                .signWith(signingKey, algoritmo)
                .compact();
    }

    /** Identificador do algoritmo em uso (ex.: {@code EdDSA}, {@code ES256}, {@code HS512}). */
    public String getAlgoritmo() {
        return algoritmo.getId();
    }

    // ── Validação ────────────────────────────────────────────────────────────

    /**
     * Valida assinatura, algoritmo e expiração. Retorna {@code null} se o token for inválido.
     * Tokens emitidos antes da V45 não têm {@code tv}: são tratados como versão 0 e continuam
     * válidos até expirar — a menos que a versão do usuário já tenha sido incrementada.
     */
    public DadosToken validar(String token) {
        if (token == null || token.isBlank()) return null;
        try {
            Claims claims = parser.parseSignedClaims(token).getPayload();
            String email = claims.getSubject();
            if (email == null || email.isBlank()) return null;
            Number tv = claims.get(CLAIM_TOKEN_VERSION, Number.class);
            return new DadosToken(email, tv == null ? 0 : tv.intValue(), claims.getId());
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    public boolean isTokenValid(String token) {
        return validar(token) != null;
    }

    public String extractEmail(String token) {
        DadosToken dados = validar(token);
        return dados == null ? null : dados.email();
    }

    // ── Privados ─────────────────────────────────────────────────────────────

    private static JwtParser construirParser(Key verifyKey, SecureDigestAlgorithm<?, ?> alg) {
        var builder = Jwts.parser().sig().clear().add(alg).and();
        if (verifyKey instanceof SecretKey sk) {
            builder.verifyWith(sk);
        } else {
            builder.verifyWith((PublicKey) verifyKey);
        }
        return builder.build();
    }

    private static MacAlgorithm macPorTamanho(int bytes) {
        if (bytes >= HS512_MIN_BYTES) return Jwts.SIG.HS512;
        if (bytes >= HS384_MIN_BYTES) return Jwts.SIG.HS384;
        return Jwts.SIG.HS256;
    }

    private record ChavesAssimetricas(PrivateKey privada, PublicKey publica, SignatureAlgorithm algoritmo) {}

    static ChavesAssimetricas carregarChaves(String privatePem, String publicPem) {
        byte[] privDer = decodePem(privatePem);
        byte[] pubDer = decodePem(publicPem);
        try {
            KeyFactory ed = KeyFactory.getInstance("Ed25519");
            PrivateKey priv = ed.generatePrivate(new PKCS8EncodedKeySpec(privDer));
            PublicKey pub = ed.generatePublic(new X509EncodedKeySpec(pubDer));
            return new ChavesAssimetricas(priv, pub, Jwts.SIG.EdDSA);
        } catch (GeneralSecurityException naoEd25519) {
            // tenta EC (ES256) abaixo
        }
        try {
            KeyFactory ec = KeyFactory.getInstance("EC");
            PrivateKey priv = ec.generatePrivate(new PKCS8EncodedKeySpec(privDer));
            PublicKey pub = ec.generatePublic(new X509EncodedKeySpec(pubDer));
            int campo = ((ECKey) pub).getParams().getCurve().getField().getFieldSize();
            if (campo != P256_FIELD_SIZE) {
                throw new IllegalStateException("Chave EC do JWT deve usar a curva P-256 (ES256)");
            }
            return new ChavesAssimetricas(priv, pub, Jwts.SIG.ES256);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException(
                    "JWT_PRIVATE_KEY/JWT_PUBLIC_KEY inválidas: use PEM PKCS#8/X.509 Ed25519 ou EC P-256", e);
        }
    }

    private static byte[] decodePem(String pem) {
        String base64 = pem
                .replaceAll("-----BEGIN [A-Z ]+-----", "")
                .replaceAll("-----END [A-Z ]+-----", "")
                .replace("\\n", "")
                .replaceAll("\\s", "");
        try {
            return Base64.getDecoder().decode(base64);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("Chave PEM do JWT com Base64 inválido", e);
        }
    }

    @SuppressWarnings("unchecked")
    private static SecureDigestAlgorithm<? super Key, ?> cast(SecureDigestAlgorithm<?, ?> alg) {
        return (SecureDigestAlgorithm<? super Key, ?>) alg;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
