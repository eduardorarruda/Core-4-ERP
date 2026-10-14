package br.com.core4erp.config.crypto;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Criptografia simétrica de campos sensíveis em repouso (CPF/CNPJ, dados bancários).
 *
 * <ul>
 *   <li><b>Cifra:</b> AES-256-GCM (confidencialidade + integridade), IV aleatório de 96 bits por
 *       valor, tag de 128 bits. Formato persistido: {@code v1:<base64(iv || ciphertext+tag)>} — o
 *       prefixo de versão permite rotacionar algoritmo/chave no futuro sem ambiguidade.</li>
 *   <li><b>Índice cego (blind index):</b> HMAC-SHA256 (hex) do valor normalizado, com chave
 *       independente. Permite busca exata e unicidade sem decifrar (ex.: "já existe parceiro com
 *       este CPF/CNPJ?"), sem revelar o valor.</li>
 * </ul>
 *
 * <p><b>Chaves obrigatórias</b> (fail fast na subida, em qualquer perfil — chave efêmera deixaria os
 * dados ilegíveis após um restart): {@code DATA_ENCRYPTION_KEY} e {@code DATA_HMAC_KEY}, cada uma
 * com 32 bytes em base64. Gerar com {@code openssl rand -base64 32}. NUNCA trocar a chave sem
 * re-cifrar os dados (perda irreversível).
 *
 * <p>Valores legados em texto puro (sem o prefixo {@code v1:}) são devolvidos como estão por
 * {@link #decifrar(String)} — compatibilidade durante a migração feita pelo
 * {@link MigradorCriptografiaCampos}.
 */
@Component
public class CriptografiaCampos {

    static final String PREFIXO_V1 = "v1:";
    private static final String ALGORITMO_CIFRA = "AES/GCM/NoPadding";
    private static final String ALGORITMO_HMAC = "HmacSHA256";
    private static final int TAMANHO_CHAVE_BYTES = 32;
    private static final int TAMANHO_IV_BYTES = 12;
    private static final int TAMANHO_TAG_BITS = 128;

    private final SecretKey chaveCifra;
    private final SecretKey chaveIndice;
    private final SecureRandom random = new SecureRandom();

    public CriptografiaCampos(@Value("${app.crypto.data-encryption-key:}") String chaveCifraBase64,
                              @Value("${app.crypto.data-hmac-key:}") String chaveIndiceBase64) {
        this.chaveCifra = new SecretKeySpec(decodificarChave(chaveCifraBase64, "DATA_ENCRYPTION_KEY"), "AES");
        this.chaveIndice = new SecretKeySpec(decodificarChave(chaveIndiceBase64, "DATA_HMAC_KEY"), ALGORITMO_HMAC);
        // Disponibiliza a instância para o AttributeConverter e os setters das entidades (índice cego),
        // que não são beans Spring.
        CriptografiaCamposHolder.definir(this);
    }

    /** Cifra o valor ({@code null} permanece {@code null}). */
    public String cifrar(String texto) {
        if (texto == null) {
            return null;
        }
        try {
            byte[] iv = new byte[TAMANHO_IV_BYTES];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance(ALGORITMO_CIFRA);
            cipher.init(Cipher.ENCRYPT_MODE, chaveCifra, new GCMParameterSpec(TAMANHO_TAG_BITS, iv));
            byte[] cifrado = cipher.doFinal(texto.getBytes(StandardCharsets.UTF_8));
            byte[] saida = ByteBuffer.allocate(iv.length + cifrado.length).put(iv).put(cifrado).array();
            return PREFIXO_V1 + Base64.getEncoder().encodeToString(saida);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Falha ao cifrar campo sensível", e);
        }
    }

    /**
     * Decifra um valor no formato {@code v1:}. Valores sem prefixo são legado em texto puro e são
     * devolvidos inalterados. Falha de autenticação (dado adulterado/chave errada) lança exceção —
     * nunca devolve lixo silenciosamente. A mensagem não contém o valor.
     */
    public String decifrar(String valor) {
        if (valor == null || !estaCifrado(valor)) {
            return valor;
        }
        try {
            byte[] entrada = Base64.getDecoder().decode(valor.substring(PREFIXO_V1.length()));
            if (entrada.length <= TAMANHO_IV_BYTES) {
                throw new IllegalStateException("Campo cifrado com formato inválido");
            }
            Cipher cipher = Cipher.getInstance(ALGORITMO_CIFRA);
            cipher.init(Cipher.DECRYPT_MODE, chaveCifra,
                    new GCMParameterSpec(TAMANHO_TAG_BITS, entrada, 0, TAMANHO_IV_BYTES));
            byte[] claro = cipher.doFinal(entrada, TAMANHO_IV_BYTES, entrada.length - TAMANHO_IV_BYTES);
            return new String(claro, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException e) {
            throw new IllegalStateException("Falha ao decifrar campo sensível (chave incorreta ou dado adulterado)", e);
        }
    }

    /**
     * Índice cego: HMAC-SHA256 (hex, 64 chars) do valor JÁ NORMALIZADO pelo chamador.
     * {@code null}/vazio → {@code null} (sem índice).
     */
    public String indiceCego(String valorNormalizado) {
        if (valorNormalizado == null || valorNormalizado.isEmpty()) {
            return null;
        }
        try {
            Mac mac = Mac.getInstance(ALGORITMO_HMAC);
            mac.init(chaveIndice);
            return HexFormat.of().formatHex(mac.doFinal(valorNormalizado.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Falha ao calcular índice cego", e);
        }
    }

    public static boolean estaCifrado(String valor) {
        return valor != null && valor.startsWith(PREFIXO_V1);
    }

    private static byte[] decodificarChave(String base64, String nomeVariavel) {
        if (base64 == null || base64.isBlank()) {
            throw new IllegalStateException(nomeVariavel + " não configurada. Gere com 'openssl rand -base64 32'"
                    + " e defina no .env — obrigatória para cifrar CPF/CNPJ e dados bancários em repouso.");
        }
        byte[] chave;
        try {
            chave = Base64.getDecoder().decode(base64.strip());
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException(nomeVariavel + " não é um base64 válido.", e);
        }
        if (chave.length != TAMANHO_CHAVE_BYTES) {
            throw new IllegalStateException(nomeVariavel + " deve ter exatamente " + TAMANHO_CHAVE_BYTES
                    + " bytes (base64 de 44 caracteres; gere com 'openssl rand -base64 32').");
        }
        return chave;
    }
}
