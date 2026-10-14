package br.com.core4erp.utils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

/** Formata valores em BRL no padrão pt-BR ("R$ 1.234,56") para textos gerados no backend. */
public final class MoedaFormatter {

    private static final Locale PT_BR = Locale.forLanguageTag("pt-BR");

    private MoedaFormatter() {}

    public static String formatar(BigDecimal valor) {
        BigDecimal v = (valor == null ? BigDecimal.ZERO : valor).setScale(2, RoundingMode.HALF_UP);
        // DecimalFormat não é thread-safe: instância por chamada (uso esporádico, fora de laço quente).
        DecimalFormat df = new DecimalFormat("#,##0.00", DecimalFormatSymbols.getInstance(PT_BR));
        String numero = df.format(v.abs());
        return (v.signum() < 0 ? "-R$ " : "R$ ") + numero;
    }
}
