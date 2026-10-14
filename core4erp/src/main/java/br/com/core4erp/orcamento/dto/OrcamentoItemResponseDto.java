package br.com.core4erp.orcamento.dto;

import br.com.core4erp.orcamento.enums.StatusOrcamento;

import java.math.BigDecimal;

/**
 * Uma linha do orçamento no mês consultado.
 *
 * @param limite               limite mensal configurado
 * @param gasto                gasto da categoria (com subcategorias) no mês — inclui contas agendadas para depois de hoje
 * @param gastoAteHoje         parte do gasto com data até hoje (base do status ATENCAO)
 * @param restante             limite − gasto (negativo quando estourou)
 * @param percentual           gasto / limite × 100 (pode passar de 100)
 * @param ritmo                % do mês já decorrido (onde o gasto "deveria" estar hoje); 100 em mês passado, 0 em mês futuro
 * @param valorEsperadoAteHoje limite × ritmo / 100
 * @param projecao             mês corrente: gasto + cartão no ritmo atual até o fim do mês; igual ao gasto nos demais
 * @param status               ESTOURADO (gasto &gt; limite) | ATENCAO (mês corrente, gastoAteHoje &gt; valorEsperadoAteHoje) | OK
 * @param sugestaoLimite       média dos 3 meses completos anteriores, arredondada para cima em múltiplos de 10 (null sem histórico)
 */
public record OrcamentoItemResponseDto(
        Long id,
        CategoriaOrcamentoDto categoria,
        BigDecimal limite,
        BigDecimal gasto,
        BigDecimal gastoAteHoje,
        BigDecimal restante,
        BigDecimal percentual,
        BigDecimal ritmo,
        BigDecimal valorEsperadoAteHoje,
        BigDecimal projecao,
        StatusOrcamento status,
        BigDecimal sugestaoLimite
) {}
