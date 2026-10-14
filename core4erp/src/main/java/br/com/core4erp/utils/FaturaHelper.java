package br.com.core4erp.utils;

import java.time.LocalDate;
import java.time.YearMonth;

public final class FaturaHelper {

    private FaturaHelper() {}

    /**
     * Determina o YearMonth da fatura à qual a compra pertence.
     * Se o dia da compra for >= diaFechamento, a compra cai na fatura do mês seguinte.
     */
    public static YearMonth calcularFatura(LocalDate dataCompra, int diaFechamento) {
        YearMonth mesCompra = YearMonth.from(dataCompra);
        return dataCompra.getDayOfMonth() >= diaFechamento
                ? mesCompra.plusMonths(1)
                : mesCompra;
    }

    /**
     * Vencimento da fatura do mês {@code mesFatura}: dia de vencimento do cartão no mês seguinte
     * (mesma regra usada ao fechar a fatura em {@code CartaoCreditoService.fecharFatura}).
     */
    public static java.time.LocalDate dataVencimento(YearMonth mesFatura, int diaVencimento) {
        YearMonth mesVencimento = mesFatura.plusMonths(1);
        return mesVencimento.atDay(Math.min(diaVencimento, mesVencimento.lengthOfMonth()));
    }
}
