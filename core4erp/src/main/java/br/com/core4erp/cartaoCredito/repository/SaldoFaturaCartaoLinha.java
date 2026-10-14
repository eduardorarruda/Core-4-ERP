package br.com.core4erp.cartaoCredito.repository;

import java.math.BigDecimal;

/**
 * Total líquido (SAIDA − ENTRADA) dos lançamentos de um cartão em uma fatura (mês/ano), com a
 * indicação de a fatura já ter sido paga (conta gerada no fechamento com status PAGO). Projeção
 * de leitura usada no cálculo do limite usado — ver {@code LimiteCartaoService}.
 */
public record SaldoFaturaCartaoLinha(Long cartaoId, Integer anoFatura, Integer mesFatura,
                                     BigDecimal liquido, Boolean paga) {}
