package br.com.core4erp.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AtualizarPerfilRequestDto(
        @NotBlank @Size(max = 150) String nome,
        @Size(min = 8, max = 128, message = "Nova senha deve ter entre 8 e 128 caracteres")
        @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$",
                 message = "Senha deve conter maiúscula, minúscula e número")
        String novaSenha,
        @Size(max = 2_000_000, message = "Foto excede o tamanho máximo permitido (≈1.5 MB)")
        @Pattern(regexp = "^(data:image/(png|jpeg|jpg|webp);base64,)?[A-Za-z0-9+/]*={0,2}$",
                 message = "Foto deve ser uma string base64 válida de imagem PNG, JPEG ou WebP")
        String fotoPerfil
) {}
