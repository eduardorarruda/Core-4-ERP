package br.com.core4erp.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Pedido para indexar um texto no RAG (base de conhecimento da empresa). */
public record RagIndexarRequestDto(
        @NotBlank(message = "Texto é obrigatório")
        @Size(max = 100_000, message = "Texto muito grande")
        String texto,

        /** Ex.: "conhecimento", "documento", "politica". Opcional. */
        String tipo,

        /** Origem do conteúdo (nome do arquivo, título). Opcional. */
        String fonte
) {}
