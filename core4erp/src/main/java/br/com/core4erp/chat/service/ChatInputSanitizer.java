package br.com.core4erp.chat.service;

import org.springframework.stereotype.Component;

/**
 * Sanitização de entrada do chat.
 *
 * <p>A defesa real contra uso indevido de tools não é um blocklist de frases (trivialmente
 * contornável por tradução/encoding e que degrada a UX), e sim a autorização na camada de
 * serviço: toda tool de escrita passa pelos serviços de domínio, que filtram pelo usuário
 * autenticado ({@code SecurityContextUtils}). Aqui apenas limitamos o tamanho da entrada
 * para conter custo de tokens e evitar payloads abusivos.
 */
@Component
public class ChatInputSanitizer {

    private static final int MAX_CHARS = 4000;

    public String sanitize(String input) {
        if (input == null) {
            return "";
        }
        String trimmed = input.strip();
        return trimmed.length() > MAX_CHARS ? trimmed.substring(0, MAX_CHARS) : trimmed;
    }
}
