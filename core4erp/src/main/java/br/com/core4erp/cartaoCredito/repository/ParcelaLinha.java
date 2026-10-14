package br.com.core4erp.cartaoCredito.repository;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Uma parcela de compra parcelada no cartão (projeção de leitura, sem entidade). */
public record ParcelaLinha(String grupoParcelamento, Integer numeroParcela, Integer totalParcelas,
                           BigDecimal valor, Integer mesFatura, Integer anoFatura,
                           String descricao, LocalDate dataCompra,
                           Long cartaoId, String cartaoNome, Integer diaVencimento,
                           String parceiro) {}
