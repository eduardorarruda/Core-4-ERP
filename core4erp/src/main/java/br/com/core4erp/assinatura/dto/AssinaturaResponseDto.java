package br.com.core4erp.assinatura.dto;

import br.com.core4erp.assinatura.entity.Assinatura;

import java.math.BigDecimal;

public record AssinaturaResponseDto(
        Long id,
        String descricao,
        BigDecimal valor,
        Integer diaVencimento,
        Boolean ativa,
        Long categoriaId,
        String categoriaDescricao,
        Long parceiroId,
        String parceiroNome
) {
    public static AssinaturaResponseDto from(Assinatura a) {
        return new AssinaturaResponseDto(
                a.getId(),
                a.getDescricao(),
                a.getValor(),
                a.getDiaVencimento(),
                a.getAtiva(),
                a.getCategoria().getId(),
                a.getCategoria().getDescricao(),
                a.getParceiro() != null ? a.getParceiro().getId() : null,
                a.getParceiro() != null ? a.getParceiro().getNomeFantasia() : null
        );
    }
}
