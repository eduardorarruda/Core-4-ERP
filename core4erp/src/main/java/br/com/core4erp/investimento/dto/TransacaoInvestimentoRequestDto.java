package br.com.core4erp.investimento.dto;

import br.com.core4erp.enums.TipoTransacaoInvestimento;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

public record TransacaoInvestimentoRequestDto(
        @NotNull(message = "Tipo é obrigatório")
        TipoTransacaoInvestimento tipoTransacao,

        @NotNull(message = "Valor é obrigatório")
        BigDecimal valor,

        @NotNull(message = "Data é obrigatória")
        LocalDate dataTransacao,

        /** Conta corrente a debitar em APORTE (opcional). */
        Long contaCorrenteOrigemId
) {}
