package br.com.core4erp.categoria.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Entrada para a sugestão de categoria por IA (botão "Sugerir categoria" nos formulários). */
public record SugerirCategoriaRequestDto(
        @NotBlank(message = "Informe a descrição do lançamento")
        @Size(max = 255)
        String descricao,

        @Size(max = 255)
        String parceiroNome
) {}
