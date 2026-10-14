package br.com.core4erp.utils;

/**
 * Validações de documentos brasileiros (CPF/CNPJ) por dígito verificador.
 *
 * <p>Enxugada na auditoria: mantém apenas o que é usado no código (antes 939 linhas, quase tudo
 * morto). Para planilhas, ver {@link PlanilhaUtils}.
 */
public final class Utils {

    private static final int[] PESO_CPF = { 11, 10, 9, 8, 7, 6, 5, 4, 3, 2 };
    private static final int[] PESO_CNPJ = { 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
    private static final int TAMANHO_CPF = 11;
    private static final int TAMANHO_CNPJ = 14;

    private Utils() {}

    /** CPF válido (com ou sem máscara): 11 dígitos, não repetidos, dígitos verificadores corretos. */
    public static boolean isValidCPF(String cpf) {
        String digitos = somenteDigitos(cpf);
        if (digitos.length() != TAMANHO_CPF || digitos.matches("(\\d)\\1{10}")) {
            return false;
        }
        int digito1 = calcularDigito(digitos.substring(0, 9), PESO_CPF);
        int digito2 = calcularDigito(digitos.substring(0, 9) + digito1, PESO_CPF);
        return digitos.equals(digitos.substring(0, 9) + digito1 + digito2);
    }

    /** CNPJ válido (com ou sem máscara): 14 dígitos, não repetidos, dígitos verificadores corretos. */
    public static boolean isValidCNPJ(String cnpj) {
        String digitos = somenteDigitos(cnpj);
        if (digitos.length() != TAMANHO_CNPJ || digitos.matches("(\\d)\\1{13}")) {
            return false;
        }
        int digito1 = calcularDigito(digitos.substring(0, 12), PESO_CNPJ);
        int digito2 = calcularDigito(digitos.substring(0, 12) + digito1, PESO_CNPJ);
        return digitos.equals(digitos.substring(0, 12) + digito1 + digito2);
    }

    private static String somenteDigitos(String texto) {
        return texto == null ? "" : texto.replaceAll("\\D", "");
    }

    private static int calcularDigito(String str, int[] peso) {
        int soma = 0;
        for (int indice = str.length() - 1; indice >= 0; indice--) {
            int digito = Character.digit(str.charAt(indice), 10);
            soma += digito * peso[peso.length - str.length() + indice];
        }
        soma = 11 - soma % 11;
        return soma > 9 ? 0 : soma;
    }
}
