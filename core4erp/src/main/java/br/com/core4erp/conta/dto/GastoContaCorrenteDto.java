package br.com.core4erp.conta.dto;

import java.math.BigDecimal;

/** Total pago (saídas) por conta corrente — usado pela IA para "onde gasto mais". */
public record GastoContaCorrenteDto(String contaCorrente, BigDecimal totalGasto) {}
