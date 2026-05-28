package br.com.core4erp.plano.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

public record PlanoRequestDto(
    @NotBlank @Size(max = 60) String nome,
    String descricao,
    @NotNull @DecimalMin("0.00") BigDecimal precoMensal,
    @NotNull @Min(-1) Integer maxUsuarios,
    @NotNull @Min(-1) Integer maxEmpresas
) {}
