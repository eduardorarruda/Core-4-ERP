package br.com.core4erp.conciliacaoCartao.dto;

import br.com.core4erp.conciliacaoCartao.entity.ConciliacaoCartaoItem;
import br.com.core4erp.conciliacaoCartao.enums.StatusItemConciliacaoCartao;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ConciliacaoCartaoItemResponseDto(
        Long id,
        String ofxId,
        String ofxTipo,
        BigDecimal ofxValor,
        LocalDate ofxData,
        String ofxMemo,
        Long lancamentoId,
        String lancamentoDescricao,
        BigDecimal lancamentoValor,
        Integer scoreVinculacao,
        StatusItemConciliacaoCartao statusItem,
        Boolean lancamentoCriadoAqui
) {
    public static ConciliacaoCartaoItemResponseDto from(ConciliacaoCartaoItem i) {
        return new ConciliacaoCartaoItemResponseDto(
                i.getId(),
                i.getOfxId(),
                i.getOfxTipo(),
                i.getOfxValor(),
                i.getOfxData(),
                i.getOfxMemo(),
                i.getLancamento() != null ? i.getLancamento().getId() : null,
                i.getLancamento() != null ? i.getLancamento().getDescricao() : null,
                i.getLancamento() != null ? i.getLancamento().getValor() : null,
                i.getScoreVinculacao(),
                i.getStatusItem(),
                i.getLancamentoCriadoAqui()
        );
    }
}
