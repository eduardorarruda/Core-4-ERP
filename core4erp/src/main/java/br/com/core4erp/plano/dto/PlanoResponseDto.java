package br.com.core4erp.plano.dto;

import java.math.BigDecimal;

public record PlanoResponseDto(
    Long id,
    String nome,
    String descricao,
    BigDecimal precoMensal,
    Integer maxUsuarios,
    Integer maxEmpresas,
    Boolean ativo
) {}
