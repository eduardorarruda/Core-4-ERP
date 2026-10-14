package br.com.core4erp.orcamento.enums;

/**
 * Situação de um orçamento no mês consultado.
 * <ul>
 *   <li>{@code OK} — dentro do limite e (no mês corrente) no ritmo esperado;</li>
 *   <li>{@code ATENCAO} — mês corrente com gasto acima do ritmo (onde deveria estar hoje);</li>
 *   <li>{@code ESTOURADO} — gasto acima do limite.</li>
 * </ul>
 */
public enum StatusOrcamento {
    OK,
    ATENCAO,
    ESTOURADO
}
