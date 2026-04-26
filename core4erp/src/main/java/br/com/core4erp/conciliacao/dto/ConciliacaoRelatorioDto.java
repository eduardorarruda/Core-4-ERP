package br.com.core4erp.conciliacao.dto;

import br.com.core4erp.conciliacao.entity.Conciliacao;
import br.com.core4erp.conciliacao.enums.StatusConciliacao;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record ConciliacaoRelatorioDto(
        Long id,
        LocalDateTime dataConciliacao,
        String contaCorrenteDescricao,
        String contaCorrenteNumero,
        String bancoId,
        String agencia,
        String numeroContaOfx,
        LocalDate dataInicioOfx,
        LocalDate dataFimOfx,
        StatusConciliacao status,
        Integer totalTransacoes,
        Integer totalConciliados,
        Integer totalNaoIdentificados,
        Integer totalIgnorados,
        Integer totalManuais,
        String observacao,
        List<ConciliacaoItemResponseDto> itens
) {
    public static ConciliacaoRelatorioDto from(Conciliacao c,
                                               int totalIgnorados,
                                               int totalManuais,
                                               List<ConciliacaoItemResponseDto> itens) {
        return new ConciliacaoRelatorioDto(
                c.getId(),
                c.getDataConciliacao(),
                c.getContaCorrente().getDescricao(),
                c.getContaCorrente().getNumeroConta(),
                c.getBancoId(),
                c.getAgencia(),
                c.getNumeroContaOfx(),
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
