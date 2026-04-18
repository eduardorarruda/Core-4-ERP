package br.com.core4erp.parceiro.dto;

import br.com.core4erp.enums.TipoParceiro;
import br.com.core4erp.parceiro.entity.Parceiro;

public record ParceiroResponseDto(
        Long id,
        String razaoSocial,
        String nomeFantasia,
        String cpfCnpj,
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
) {
    public static ParceiroResponseDto from(Parceiro p) {
        return new ParceiroResponseDto(
                p.getId(), p.getRazaoSocial(), p.getNomeFantasia(),
                p.getCpfCnpj(), p.getTipo(),
                p.getLogradouro(), p.getNumero(), p.getComplemento(),
                p.getCep(), p.getBairro(), p.getMunicipio(), p.getUf(),
                p.getTelefone(), p.getEmail()
        );
    }
}
