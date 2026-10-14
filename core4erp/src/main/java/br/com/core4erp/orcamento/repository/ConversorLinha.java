package br.com.core4erp.orcamento.repository;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Converte colunas de native query (Object[]) para tipos Java estáveis. O driver/Hibernate pode
 * devolver {@code java.sql.Date} ou {@code LocalDate}, {@code BigDecimal}/{@code Long}/{@code Integer}
 * conforme a versão — centralizado aqui para não espalhar casts frágeis.
 */
final class ConversorLinha {

    private ConversorLinha() {}

    static BigDecimal decimal(Object o) {
        if (o == null) return BigDecimal.ZERO;
        if (o instanceof BigDecimal b) return b;
        if (o instanceof Number n) return new BigDecimal(n.toString());
        throw new IllegalStateException("Tipo numérico inesperado: " + o.getClass().getSimpleName());
    }

    static Long longo(Object o) {
        if (o == null) return null;
        if (o instanceof Number n) return n.longValue();
        throw new IllegalStateException("Tipo inteiro inesperado: " + o.getClass().getSimpleName());
    }

    static int inteiro(Object o) {
        if (o instanceof Number n) return n.intValue();
        throw new IllegalStateException("Tipo inteiro inesperado: " + (o == null ? "null" : o.getClass().getSimpleName()));
    }

    static LocalDate data(Object o) {
        if (o == null) return null;
        if (o instanceof LocalDate d) return d;
        if (o instanceof java.sql.Date d) return d.toLocalDate();
        if (o instanceof java.util.Date d) return new java.sql.Date(d.getTime()).toLocalDate();
        throw new IllegalStateException("Tipo de data inesperado: " + o.getClass().getSimpleName());
    }
}
