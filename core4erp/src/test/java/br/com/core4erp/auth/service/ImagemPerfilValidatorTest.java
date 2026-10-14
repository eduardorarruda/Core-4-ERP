package br.com.core4erp.auth.service;

import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ImagemPerfilValidatorTest {

    static final byte[] PNG = {(byte) 0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A, 0, 0};
    static final byte[] JPEG = {(byte) 0xFF, (byte) 0xD8, (byte) 0xFF, (byte) 0xE0, 0};
    static final byte[] WEBP = "RIFF\0\0\0\0WEBPVP8 ".getBytes(StandardCharsets.ISO_8859_1);
    static final byte[] GIF = "GIF89a....".getBytes(StandardCharsets.US_ASCII);

    @Test
    void detectaFormatosPermitidosPeloConteudo() {
        assertThat(ImagemPerfilValidator.detectarTipo(PNG)).isEqualTo("image/png");
        assertThat(ImagemPerfilValidator.detectarTipo(JPEG)).isEqualTo("image/jpeg");
        assertThat(ImagemPerfilValidator.detectarTipo(WEBP)).isEqualTo("image/webp");
        assertThat(ImagemPerfilValidator.detectarTipo(GIF)).isEqualTo("image/gif");
    }

    @Test
    void svg_recusadoExplicitamente() {
        byte[] svg = "<?xml version=\"1.0\"?><svg onload=\"alert(1)\"></svg>".getBytes(StandardCharsets.UTF_8);
        assertThatThrownBy(() -> ImagemPerfilValidator.detectarTipo(svg))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("SVG");
    }

    @Test
    void formatoDesconhecido_vazioEGrande_recusados() {
        assertThatThrownBy(() -> ImagemPerfilValidator.detectarTipo("MZ\u0090executavel".getBytes()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ImagemPerfilValidator.detectarTipo(new byte[0]))
                .isInstanceOf(IllegalArgumentException.class);
        byte[] grande = new byte[ImagemPerfilValidator.TAMANHO_MAXIMO + 1];
        System.arraycopy(PNG, 0, grande, 0, PNG.length);
        assertThatThrownBy(() -> ImagemPerfilValidator.detectarTipo(grande))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void fotoViaJson_usaTipoDetectadoNaoODeclarado() {
        String declaradoComoJpegMasEPng = "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(PNG);
        assertThat(ProfileService.normalizarFotoDataUrl(declaradoComoJpegMasEPng)).startsWith("data:image/png;base64,");
        assertThat(ProfileService.normalizarFotoDataUrl("")).isNull();
        String svg = Base64.getEncoder().encodeToString("<svg/>".getBytes());
        assertThatThrownBy(() -> ProfileService.normalizarFotoDataUrl(svg)).isInstanceOf(IllegalArgumentException.class);
    }
}
