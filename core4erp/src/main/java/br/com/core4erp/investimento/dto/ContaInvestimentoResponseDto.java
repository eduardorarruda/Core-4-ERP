package br.com.core4erp.investimento.dto;

import br.com.core4erp.enums.TipoInvestimento;
import br.com.core4erp.investimento.entity.ContaInvestimento;

import java.math.BigDecimal;

public record ContaInvestimentoResponseDto(
        Long id,
        String nome,
        TipoInvestimento tipo,
        BigDecimal saldoAtual
) {
    public static ContaInvestimentoResponseDto from(ContaInvestimento c) {
        return new ContaInvestimentoResponseDto(c.getId(), c.getNome(), c.getTipo(), c.getSaldoAtual());
    }
}
