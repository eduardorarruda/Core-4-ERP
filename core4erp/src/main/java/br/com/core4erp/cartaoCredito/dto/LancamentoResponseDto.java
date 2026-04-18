package br.com.core4erp.cartaoCredito.dto;

import br.com.core4erp.cartaoCredito.entity.LancamentoCartao;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LancamentoResponseDto(
        Long id,
        String descricao,
        BigDecimal valor,
        LocalDate dataCompra,
        Integer mesFatura,
        Integer anoFatura,
        String grupoParcelamento,
        Integer numeroParcela,
        Integer totalParcelas,
        Long categoriaId,
        String categoriaDescricao,
        boolean faturaFechada
) {
    public static LancamentoResponseDto from(LancamentoCartao l, boolean faturaFechada) {
        return new LancamentoResponseDto(
                l.getId(), l.getDescricao(), l.getValor(), l.getDataCompra(),
                l.getMesFatura(), l.getAnoFatura(),
                l.getGrupoParcelamento(), l.getNumeroParcela(), l.getTotalParcelas(),
                l.getCategoria().getId(), l.getCategoria().getDescricao(),
                faturaFechada
        );
    }
}
