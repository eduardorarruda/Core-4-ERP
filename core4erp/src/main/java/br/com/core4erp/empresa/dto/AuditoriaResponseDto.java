package br.com.core4erp.empresa.dto;

import br.com.core4erp.empresa.entity.AcaoAuditoria;
import br.com.core4erp.empresa.entity.Auditoria;

import java.time.LocalDateTime;

public record AuditoriaResponseDto(
    Long id,
    Long empresaId,
    Long usuarioId,
    String entidade,
    Long entidadeId,
    AcaoAuditoria acao,
    String valorAnterior,
    String valorNovo,
    String ipAddress,
    String requestId,
    LocalDateTime timestamp
) {
    public static AuditoriaResponseDto from(Auditoria a) {
        return new AuditoriaResponseDto(
            a.getId(), a.getEmpresaId(), a.getUsuarioId(),
            a.getEntidade(), a.getEntidadeId(), a.getAcao(),
            a.getValorAnterior(), a.getValorNovo(),
            a.getIpAddress(), a.getRequestId(), a.getDataHora()
        );
    }
}
