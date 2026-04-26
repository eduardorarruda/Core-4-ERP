package br.com.core4erp.conciliacao.dto;

import br.com.core4erp.conciliacao.entity.Conciliacao;
import br.com.core4erp.conciliacao.enums.StatusConciliacao;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record ConciliacaoResponseDto(
        Long id,
        LocalDateTime dataConciliacao,
        Long contaCorrenteId,
        String contaCorrenteDescricao,
        String contaCorrenteNumero,
        StatusConciliacao status,
        String bancoId,
        String agencia,
        String numeroContaOfx,
        LocalDate dataInicioOfx,
        LocalDate dataFimOfx,
        Integer totalTransacoes,
        Integer totalConciliados,
        Integer totalNaoIdentificados,
        String observacao,
        List<ConciliacaoItemResponseDto> itens
) {
    public static ConciliacaoResponseDto from(Conciliacao c, List<ConciliacaoItemResponseDto> itens) {
        return new ConciliacaoResponseDto(
                c.getId(),
                c.getDataConciliacao(),
                c.getContaCorrente().getId(),
                c.getContaCorrente().getDescricao(),
                c.getContaCorrente().getNumeroConta(),
                c.getStatus(),
                c.getBancoId(),
                c.getAgencia(),
                c.getNumeroContaOfx(),
                c.getDataInicioOfx(),
                c.getDataFimOfx(),
                c.getTotalTransacoes(),
                c.getTotalConciliados(),
                c.getTotalNaoIdentificados(),
                c.getObservacao(),
                itens
        );
    }

    public static ConciliacaoResponseDto fromSemItens(Conciliacao c) {
        return from(c, null);
    }
}
