package br.com.core4erp.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Atualização de nome/foto. A senha NÃO é alterada aqui: use {@code PATCH /api/auth/senha}, que
 * exige a senha atual e revoga as demais sessões.
 */
public record AtualizarPerfilRequestDto(
        @NotBlank @Size(max = 150) String nome,
        @Size(max = 2_000_000, message = "Foto excede o tamanho máximo permitido (≈1.5 MB)")
        @Pattern(regexp = "^(data:image/(png|jpeg|jpg|webp|gif);base64,)?[A-Za-z0-9+/]*={0,2}$",
                 message = "Foto deve ser uma imagem PNG, JPEG, WebP ou GIF")
        String fotoPerfil
) {}
