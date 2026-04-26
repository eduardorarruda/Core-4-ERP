package br.com.core4erp.conciliacao.dto;

import br.com.core4erp.conciliacao.entity.ConciliacaoItem;
import br.com.core4erp.conciliacao.enums.StatusItemConciliacao;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ConciliacaoItemResponseDto(
        Long id,
        String ofxId,
        String ofxTipo,
        BigDecimal ofxValor,
        LocalDate ofxData,
        String ofxMemo,
        String ofxNome,
        Long contaId,
        String contaDescricao,
        BigDecimal contaValor,
        Integer scoreVinculacao,
        StatusItemConciliacao statusItem,
        Boolean contaCriadaAqui,
        Long contaBaixadaId
) {
    public static ConciliacaoItemResponseDto from(ConciliacaoItem i) {
        return new ConciliacaoItemResponseDto(
                i.getId(),
                i.getOfxId(),
                i.getOfxTipo(),
                i.getOfxValor(),
                i.getOfxData(),
                i.getOfxMemo(),
                i.getOfxNome(),
                i.getConta() != null ? i.getConta().getId() : null,
                i.getConta() != null ? i.getConta().getDescricao() : null,
                i.getConta() != null ? i.getConta().getValorOriginal() : null,
                i.getScoreVinculacao(),
                i.getStatusItem(),
                i.getContaCriadaAqui(),
                i.getContaBaixada() != null ? i.getContaBaixada().getId() : null
        );
    }
}
