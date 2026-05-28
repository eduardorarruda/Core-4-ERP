package br.com.core4erp.plano.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PagamentoResponseDto(
    Long id,
    String planoNome,
    BigDecimal valor,
    String status,
    String forma,
    LocalDateTime dataPagamento
) {}
