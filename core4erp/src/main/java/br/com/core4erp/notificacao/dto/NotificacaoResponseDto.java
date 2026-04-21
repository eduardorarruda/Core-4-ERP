package br.com.core4erp.notificacao.dto;

import br.com.core4erp.enums.TipoNotificacao;
import br.com.core4erp.notificacao.entity.Notificacao;

import java.time.LocalDateTime;

public record NotificacaoResponseDto(
        Long id,
        String mensagem,
        Boolean lida,
        LocalDateTime dataCriacao,
        TipoNotificacao tipo,
        Long referenciaId
) {
    public static NotificacaoResponseDto from(Notificacao n) {
        return new NotificacaoResponseDto(
                n.getId(), n.getMensagem(), n.getLida(),
                n.getDataCriacao(), n.getTipo(), n.getReferenciaId()
        );
    }
}
