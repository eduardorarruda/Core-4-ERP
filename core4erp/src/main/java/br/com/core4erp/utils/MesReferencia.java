package br.com.core4erp.utils;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;

/** Resolve o parâmetro {@code ?mes=AAAA-MM} das telas mensais (Orçamento, Insights). */
public final class MesReferencia {

    /** Datas de negócio ("hoje", dia do mês) seguem o fuso de exibição do produto (CLAUDE.md §16). */
    public static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    private static final int ANO_MINIMO = 2000;
    private static final int ANO_MAXIMO = 2100;

    private MesReferencia() {}

    /** Mês informado ou o mês de {@code hoje}; rejeita anos absurdos com mensagem amigável (400). */
    public static YearMonth resolver(YearMonth mes, LocalDate hoje) {
        if (mes == null) return YearMonth.from(hoje);
        if (mes.getYear() < ANO_MINIMO || mes.getYear() > ANO_MAXIMO) {
            throw new IllegalArgumentException("Escolha um mês entre " + ANO_MINIMO + " e " + ANO_MAXIMO + ".");
        }
        return mes;
    }
}
