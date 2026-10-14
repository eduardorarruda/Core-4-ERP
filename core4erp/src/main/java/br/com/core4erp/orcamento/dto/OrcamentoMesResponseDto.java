package br.com.core4erp.orcamento.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Orçamento de um mês.
 *
 * @param mes               "AAAA-MM"
 * @param dataReferencia    "hoje" usado no cálculo do ritmo (último dia em mês passado; null em mês futuro)
 * @param ritmo             % do mês decorrido
 * @param percentualTotal   totalGasto / totalLimite × 100
 * @param gastoSemOrcamento gasto no mês em categorias que não têm limite definido
 */
public record OrcamentoMesResponseDto(
        String mes,
        LocalDate dataReferencia,
        BigDecimal ritmo,
        BigDecimal totalLimite,
        BigDecimal totalGasto,
        BigDecimal percentualTotal,
        BigDecimal gastoSemOrcamento,
        List<OrcamentoItemResponseDto> itens
) {}
