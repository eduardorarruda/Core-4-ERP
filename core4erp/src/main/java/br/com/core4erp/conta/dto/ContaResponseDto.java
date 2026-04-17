package br.com.core4erp.conta.dto;

import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.TipoConta;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContaResponseDto(
        Long id,
        String descricao,
        BigDecimal valorOriginal,
        LocalDate dataVencimento,
        TipoConta tipo,
        StatusConta status,
        String grupoParcelamento,
        Integer numeroParcela,
        Integer totalParcelas,
        Long categoriaId,
        String categoriaDescricao,
        Long parceiroId,
        String parceiroNome
) {
    public static ContaResponseDto from(Conta c) {
        return new ContaResponseDto(
                c.getId(), c.getDescricao(), c.getValorOriginal(), c.getDataVencimento(),
                c.getTipo(), c.getStatus(), c.getGrupoParcelamento(),
                c.getNumeroParcela(), c.getTotalParcelas(),
                c.getCategoria().getId(), c.getCategoria().getDescricao(),
                c.getParceiro() != null ? c.getParceiro().getId() : null,
                c.getParceiro() != null ? c.getParceiro().getNome() : null
        );
    }
}
