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
}
