package br.com.core4erp.investimento.dto;

import br.com.core4erp.investimento.entity.ContaInvestimento;

import java.math.BigDecimal;

public record ContaInvestimentoResponseDto(
        Long id,
        String nome,
        Long tipoId,
        String tipoNome,
        BigDecimal saldoAtual
) {
    public static ContaInvestimentoResponseDto from(ContaInvestimento c) {
        return new ContaInvestimentoResponseDto(
                c.getId(),
                c.getNome(),
                c.getTipoInvestimento() != null ? c.getTipoInvestimento().getId() : null,
                c.getTipoInvestimento() != null ? c.getTipoInvestimento().getNome() : null,
                c.getSaldoAtual()
        );
    }
}
