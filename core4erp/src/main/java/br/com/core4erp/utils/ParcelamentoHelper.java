package br.com.core4erp.utils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

public final class ParcelamentoHelper {

    private ParcelamentoHelper() {}

    public static int normalizarParcelas(Integer quantidadeParcelas) {
        return (quantidadeParcelas == null || quantidadeParcelas < 1) ? 1 : quantidadeParcelas;
    }

    public static int normalizarIntervalo(Integer intervaloMeses) {
        return (intervaloMeses == null || intervaloMeses < 1) ? 1 : intervaloMeses;
    }

    public static BigDecimal calcularValorPorParcela(BigDecimal valorTotal, int parcelas, boolean dividir) {
        if (dividir && parcelas > 1) {
            return valorTotal.divide(BigDecimal.valueOf(parcelas), 2, RoundingMode.HALF_UP);
        }
        return valorTotal;
    }

    public static String gerarGrupoParcelamento(int parcelas) {
        return parcelas > 1 ? UUID.randomUUID().toString() : null;
    }
}
