package br.com.core4erp.contaCorrente.dto;

import br.com.core4erp.contaCorrente.entity.ContaCorrente;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ContaCorrenteResponseDto(
        Long id,
        String numeroConta,
        String agencia,
        String descricao,
        BigDecimal saldo,
        LocalDate dataSaldoInicial,
        Boolean permitirSaldoNegativo
) {
    public static ContaCorrenteResponseDto from(ContaCorrente c) {
        return new ContaCorrenteResponseDto(
                c.getId(), c.getNumeroConta(), c.getAgencia(), c.getDescricao(),
                c.getSaldo(), c.getDataSaldoInicial(),
                Boolean.TRUE.equals(c.getPermitirSaldoNegativo()));
    }
}
