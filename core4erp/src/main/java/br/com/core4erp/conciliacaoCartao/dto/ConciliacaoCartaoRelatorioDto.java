package br.com.core4erp.conciliacaoCartao.dto;

import br.com.core4erp.conciliacaoCartao.entity.ConciliacaoCartao;
import br.com.core4erp.conciliacaoCartao.enums.StatusConciliacaoCartao;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record ConciliacaoCartaoRelatorioDto(
        Long id,
        LocalDateTime dataConciliacao,
        String cartaoCreditoNome,
        String acctIdOfx,
        LocalDate dataInicioOfx,
        LocalDate dataFimOfx,
        StatusConciliacaoCartao status,
        Integer totalTransacoes,
        Integer totalConciliados,
        Integer totalNaoIdentificados,
        Integer totalIgnorados,
        Integer totalManuais,
        String observacao,
        List<ConciliacaoCartaoItemResponseDto> itens
) {
    public static ConciliacaoCartaoRelatorioDto from(ConciliacaoCartao c,
                                                      int totalIgnorados,
                                                      int totalManuais,
                                                      List<ConciliacaoCartaoItemResponseDto> itens) {
        return new ConciliacaoCartaoRelatorioDto(
                c.getId(),
                c.getDataConciliacao(),
                c.getCartaoCredito().getNome(),
                c.getAcctIdOfx(),
                c.getDataInicioOfx(),
                c.getDataFimOfx(),
                c.getStatus(),
                c.getTotalTransacoes(),
                c.getTotalConciliados(),
                c.getTotalNaoIdentificados(),
                totalIgnorados,
                totalManuais,
                c.getObservacao(),
                itens
        );
    }
}
