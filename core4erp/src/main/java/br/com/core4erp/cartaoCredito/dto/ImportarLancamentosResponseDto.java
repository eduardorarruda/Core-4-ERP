package br.com.core4erp.cartaoCredito.dto;

import java.util.List;

/**
 * Resultado do import de planilha de lançamentos de cartão. Resumo amigável para a tela:
 * quantas linhas vieram, quantas viraram lançamento, quantos itens foram criados (contando
 * parcelas), quantas categorias/parceiros novos foram cadastrados no caminho, quantas linhas
 * foram ignoradas (já existiam) e a lista de erros por linha (com motivo em linguagem simples).
 */
public record ImportarLancamentosResponseDto(
        int totalLinhas,
        int linhasImportadas,
        int lancamentosCriados,
        int categoriasCriadas,
        int parceirosCriados,
        int ignorados,
        List<ErroLinha> erros
) {
    /** Erro de uma linha específica da planilha. {@code linha} é 1-based como o usuário vê no Excel. */
    public record ErroLinha(int linha, String motivo) {}
}
