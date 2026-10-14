package br.com.core4erp.auth.dto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Exportação dos dados pessoais do titular (LGPD art. 18, II e V — acesso e portabilidade).
 * Nunca inclui hash de senha, tokens ou dados de outros usuários.
 */
public record DadosPessoaisResponseDto(
        LocalDateTime geradoEm,
        Titular titular,
        Consentimento consentimento,
        List<VinculoEmpresa> empresas
) {
    public record Titular(Long id, String nome, String email, String telefone, String tipoConta,
                          boolean possuiFotoPerfil, LocalDateTime criadoEm, LocalDateTime atualizadoEm) {}

    public record Consentimento(LocalDateTime termosAceitosEm, String termosVersao) {}

    public record VinculoEmpresa(Long empresaId, String empresaNome, String perfil, boolean ativo,
                                 LocalDateTime dataIngresso) {}
}
