package br.com.core4erp.empresa.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record EmpresaRequestDto(
    @NotBlank @Size(max = 150) String nome,
    @Size(max = 18) String cnpj,
    @Size(max = 150) String emailContato,
    @Size(max = 20) String telefone,
    String plano
) {}
