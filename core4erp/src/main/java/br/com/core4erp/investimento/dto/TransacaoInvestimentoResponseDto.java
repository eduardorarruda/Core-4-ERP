package br.com.core4erp.investimento.dto;

import br.com.core4erp.enums.TipoTransacaoInvestimento;
import br.com.core4erp.investimento.entity.TransacaoInvestimento;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransacaoInvestimentoResponseDto(
        Long id,
        TipoTransacaoInvestimento tipoTransacao,
        BigDecimal valor,
        LocalDate dataTransacao,
        Long contaCorrenteOrigemId
) {
    public static TransacaoInvestimentoResponseDto from(TransacaoInvestimento t) {
        return new TransacaoInvestimentoResponseDto(
                t.getId(), t.getTipoTransacao(), t.getValor(), t.getDataTransacao(),
                t.getContaCorrenteOrigem() != null ? t.getContaCorrenteOrigem().getId() : null
        );
    }
}
