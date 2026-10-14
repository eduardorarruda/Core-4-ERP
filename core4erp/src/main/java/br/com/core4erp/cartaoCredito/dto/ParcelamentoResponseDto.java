package br.com.core4erp.cartaoCredito.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Compra parcelada no cartão ainda em andamento.
 *
 * @param grupoParcelamento id estável do parcelamento (UUID gerado no lançamento)
 * @param parcelaAtual      nº da última parcela em fatura até o mês atual (0 = a 1ª ainda não entrou)
 * @param primeiraFatura    "AAAA-MM" da fatura da 1ª parcela
 * @param terminaEm         "AAAA-MM" da fatura da última parcela
 * @param valorRestante     soma das parcelas em faturas depois do mês atual
 * @param proximasParcelas  parcelas futuras com a data de vencimento prevista (regra do fechamento:
 *                          fatura do mês M vence no dia de vencimento do cartão em M+1)
 */
public record ParcelamentoResponseDto(
        String grupoParcelamento,
        String descricao,
        String parceiro,
        CartaoResumoDto cartao,
        LocalDate dataCompra,
        BigDecimal valorTotal,
        BigDecimal valorParcela,
        int parcelaAtual,
        int totalParcelas,
        int parcelasRestantes,
        BigDecimal valorRestante,
        String primeiraFatura,
        String terminaEm,
        List<ProximaParcelaDto> proximasParcelas
) {
    public record CartaoResumoDto(Long id, String nome) {}

    public record ProximaParcelaDto(int numeroParcela, String fatura, LocalDate dataVencimento, BigDecimal valor) {}
}
