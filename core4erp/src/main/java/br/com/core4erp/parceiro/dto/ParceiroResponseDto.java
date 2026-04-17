package br.com.core4erp.parceiro.dto;

import br.com.core4erp.enums.TipoParceiro;
import br.com.core4erp.parceiro.entity.Parceiro;

import java.time.LocalDate;

public record ParceiroResponseDto(
        Long id,
        String nome,
        TipoParceiro tipo,
        String razaoSocial,
        String nomeFantasia,
        String cpfCnpj,
        String endereco,
        LocalDate dataNascimentoFundacao
) {
    public static ParceiroResponseDto from(Parceiro p) {
        return new ParceiroResponseDto(
                p.getId(), p.getNome(), p.getTipo(),
                p.getRazaoSocial(), p.getNomeFantasia(),
                p.getCpfCnpj(), p.getEndereco(),
                p.getDataNascimentoFundacao()
        );
    }
}
