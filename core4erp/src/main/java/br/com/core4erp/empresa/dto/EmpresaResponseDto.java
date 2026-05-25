package br.com.core4erp.empresa.dto;

import br.com.core4erp.empresa.entity.Empresa;

public record EmpresaResponseDto(
    Long id,
    String nome,
    String cnpj,
    String emailContato,
    String telefone,
    String plano,
    Boolean ativa
) {
    public static EmpresaResponseDto from(Empresa e) {
        return new EmpresaResponseDto(
            e.getId(), e.getNome(), e.getCnpj(),
            e.getEmailContato(), e.getTelefone(), e.getPlano(), e.getAtiva()
        );
    }
}
