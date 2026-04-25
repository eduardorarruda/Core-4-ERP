package br.com.core4erp.chat.service;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class ChatInputSanitizer {

    private static final List<String> BLOCKED_PATTERNS = List.of(
            "ignore previous instructions",
            "ignore all instructions",
            "you are now",
            "system prompt",
            "reveal your instructions"
    );

    public String sanitize(String input) {
        String lower = input.toLowerCase();
        for (String pattern : BLOCKED_PATTERNS) {
            if (lower.contains(pattern)) {
                return "[mensagem bloqueada por segurança]";
            }
        }
        return input.length() > 4000 ? input.substring(0, 4000) : input;
    }
}
