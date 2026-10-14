package br.com.core4erp.auth.service;

import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Valida a foto de perfil pelo CONTEÚDO (magic bytes), nunca pelo Content-Type/extensão
 * informados pelo cliente. Aceita somente PNG, JPEG, WebP e GIF; SVG é recusado explicitamente
 * (pode carregar script — XSS armazenado quando servido como imagem).
 */
public final class ImagemPerfilValidator {

    public static final int TAMANHO_MAXIMO = 1_500_000;

    static final String MSG_FORMATO = "Formato de imagem não suportado. Use PNG, JPEG, WebP ou GIF.";
    static final String MSG_SVG = "Imagens SVG não são aceitas. Envie a foto em PNG, JPEG, WebP ou GIF.";
    static final String MSG_TAMANHO = "A foto excede o tamanho máximo de 1,5 MB.";
    static final String MSG_VAZIA = "Selecione uma imagem para enviar.";

    private static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A};
    private static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF};
    private static final byte[] GIF87 = "GIF87a".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] GIF89 = "GIF89a".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] RIFF = "RIFF".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] WEBP = "WEBP".getBytes(StandardCharsets.US_ASCII);
    private static final int WEBP_OFFSET = 8;
    private static final int AMOSTRA_TEXTO = 512;

    private ImagemPerfilValidator() {}

    /**
     * @return o content type DETECTADO (ex.: {@code image/png})
     * @throws IllegalArgumentException se vazio, grande demais, SVG ou formato não suportado
     */
    public static String detectarTipo(byte[] bytes) {
        if (bytes == null || bytes.length == 0) throw new IllegalArgumentException(MSG_VAZIA);
        if (bytes.length > TAMANHO_MAXIMO) throw new IllegalArgumentException(MSG_TAMANHO);
        if (comeca(bytes, PNG, 0)) return "image/png";
        if (comeca(bytes, JPEG, 0)) return "image/jpeg";
        if (comeca(bytes, GIF87, 0) || comeca(bytes, GIF89, 0)) return "image/gif";
        if (comeca(bytes, RIFF, 0) && comeca(bytes, WEBP, WEBP_OFFSET)) return "image/webp";
        if (pareceSvgOuTexto(bytes)) throw new IllegalArgumentException(MSG_SVG);
        throw new IllegalArgumentException(MSG_FORMATO);
    }

    private static boolean comeca(byte[] bytes, byte[] assinatura, int offset) {
        if (bytes.length < offset + assinatura.length) return false;
        for (int i = 0; i < assinatura.length; i++) {
            if (bytes[offset + i] != assinatura[i]) return false;
        }
        return true;
    }

    private static boolean pareceSvgOuTexto(byte[] bytes) {
        String inicio = new String(bytes, 0, Math.min(bytes.length, AMOSTRA_TEXTO), StandardCharsets.UTF_8)
                .toLowerCase(Locale.ROOT);
        return inicio.contains("<svg") || inicio.stripLeading().startsWith("<");
    }
}
