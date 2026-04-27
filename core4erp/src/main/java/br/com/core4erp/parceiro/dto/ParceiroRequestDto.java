package br.com.core4erp.parceiro.dto;

import br.com.core4erp.enums.TipoParceiro;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ParceiroRequestDto(
        @NotBlank(message = "Razão social é obrigatória")
        @Size(max = 150)
        String razaoSocial,

        @Size(max = 150) String nomeFantasia,
        @Size(max = 20) String cpfCnpj,

        @NotNull(message = "Tipo é obrigatório")
        TipoParceiro tipo,

        @Size(max = 200) String logradouro,
        @Size(max = 20) String numero,
        @Size(max = 100) String complemento,
        @Size(max = 10) String cep,
        @Size(max = 100) String bairro,
        @Size(max = 100) String municipio,
        @Size(max = 2) String uf,
        @Size(max = 20) String telefone,
        @Email @Size(max = 150) String email
) {}
