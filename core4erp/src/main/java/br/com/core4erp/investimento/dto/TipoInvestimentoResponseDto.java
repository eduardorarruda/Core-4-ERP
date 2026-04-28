package br.com.core4erp.investimento.dto;

import br.com.core4erp.investimento.entity.TipoInvestimentoCustom;

public record TipoInvestimentoResponseDto(Long id, String nome) {
    public static TipoInvestimentoResponseDto from(TipoInvestimentoCustom t) {
        return new TipoInvestimentoResponseDto(t.getId(), t.getNome());
    }
}
