package br.com.core4erp.contaCorrente.dto;

import br.com.core4erp.contaCorrente.entity.Transferencia;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransferenciaResponseDto(
        Long id,
        Long contaOrigemId,
        String contaOrigemDescricao,
        Long contaDestinoId,
        String contaDestinoDescricao,
        BigDecimal valor,
        LocalDate dataTransferencia
) {
    public static TransferenciaResponseDto from(Transferencia t) {
        return new TransferenciaResponseDto(
                t.getId(),
                t.getContaOrigem().getId(),
                t.getContaOrigem().getDescricao(),
                t.getContaDestino().getId(),
                t.getContaDestino().getDescricao(),
                t.getValor(),
                t.getDataTransferencia()
        );
    }
}
