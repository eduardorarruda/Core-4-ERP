package br.com.core4erp.cartaoCredito.dto;

import br.com.core4erp.cartaoCredito.entity.CartaoCredito;

import java.math.BigDecimal;

public record CartaoCreditoResponseDto(
        Long id,
        String nome,
        BigDecimal limite,
        Integer diaFechamento,
        Integer diaVencimento,
        Long contaCorrenteId,
        String contaCorrenteApelido,
        BigDecimal limiteUsado,
        BigDecimal limiteLivre
) {
    public static CartaoCreditoResponseDto from(CartaoCredito c, BigDecimal limiteUsado) {
        BigDecimal livre = c.getLimite().subtract(limiteUsado);
        return new CartaoCreditoResponseDto(
                c.getId(), c.getNome(), c.getLimite(),
                c.getDiaFechamento(), c.getDiaVencimento(),
                c.getContaCorrente().getId(), c.getContaCorrente().getApelido(),
                limiteUsado, livre
        );
    }
}
