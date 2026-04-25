package br.com.core4erp.chat.dto;

import java.util.List;
import java.util.Map;

public record ChatResponseDto(
        String resposta,
        String downloadUrl,
        List<ToolCallDto> toolCalls
) {
    public record ToolCallDto(
            String toolName,
            String toolCallId,
            Map<String, Object> args,
            Object result
    ) {}
}
