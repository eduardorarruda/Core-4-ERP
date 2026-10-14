package br.com.core4erp.conciliacaoCartao.dto;

import br.com.core4erp.conciliacaoCartao.entity.ConciliacaoCartao;
import br.com.core4erp.conciliacaoCartao.enums.StatusConciliacaoCartao;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record ConciliacaoCartaoResponseDto(
        Long id,
        LocalDateTime dataConciliacao,
        Long cartaoCreditoId,
        String cartaoCreditoNome,
        StatusConciliacaoCartao status,
        String acctIdOfx,
        LocalDate dataInicioOfx,
        LocalDate dataFimOfx,
        Integer totalTransacoes,
        Integer totalConciliados,
        Integer totalNaoIdentificados,
        String observacao,
        List<ConciliacaoCartaoItemResponseDto> itens
) {
    public static ConciliacaoCartaoResponseDto from(ConciliacaoCartao c, List<ConciliacaoCartaoItemResponseDto> itens) {
        return new ConciliacaoCartaoResponseDto(
                c.getId(),
                c.getDataConciliacao(),
                c.getCartaoCredito().getId(),
                c.getCartaoCredito().getNome(),
                c.getStatus(),
                c.getAcctIdOfx(),
                c.getDataInicioOfx(),
                c.getDataFimOfx(),
                c.getTotalTransacoes(),
                c.getTotalConciliados(),
                c.getTotalNaoIdentificados(),
                c.getObservacao(),
                itens
        );
    }

    public static ConciliacaoCartaoResponseDto fromSemItens(ConciliacaoCartao c) {
        return from(c, null);
    }
}
