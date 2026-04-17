package br.com.core4erp.parceiro.dto;

import br.com.core4erp.enums.TipoParceiro;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record ParceiroRequestDto(
        @NotBlank(message = "Nome é obrigatório")
        String nome,

        @NotNull(message = "Tipo é obrigatório")
        TipoParceiro tipo,

        String razaoSocial,
        String nomeFantasia,
        String cpfCnpj,
        String endereco,
        LocalDate dataNascimentoFundacao
) {}
