package br.com.core4erp.parceiro.dto;

import br.com.core4erp.enums.TipoParceiro;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ParceiroRequestDto(
        @NotBlank(message = "Razão social é obrigatória")
        String razaoSocial,

        String nomeFantasia,
        String cpfCnpj,

        @NotNull(message = "Tipo é obrigatório")
        TipoParceiro tipo,

        String logradouro,
        String numero,
        String complemento,
        String cep,
        String bairro,
        String municipio,
        String uf,
        String telefone,
        String email
) {}
