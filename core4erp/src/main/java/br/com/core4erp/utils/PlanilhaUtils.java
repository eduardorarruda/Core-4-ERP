package br.com.core4erp.utils;

/**
 * Utilitários para geração de planilhas (Excel/CSV).
 *
 * <p><b>Proteção contra CSV/Formula injection (OWASP):</b> textos vindos do usuário (descrição,
 * nome de parceiro, categoria...) que começam com {@code = + - @ \t \r} seriam interpretados como
 * fórmula pelo Excel/LibreOffice ao abrir o arquivo (ex.: {@code =HYPERLINK(...)}, DDE). Prefixar
 * com apóstrofo força o conteúdo a ser tratado como texto.
 */
public final class PlanilhaUtils {

    private static final String GATILHOS_FORMULA = "=+-@\t\r";

    private PlanilhaUtils() {}

    /**
     * Devolve o texto seguro para gravar em célula: prefixa {@code '} quando o primeiro caractere
     * é um gatilho de fórmula. {@code null} vira texto vazio.
     */
    public static String textoSeguro(String valor) {
        if (valor == null || valor.isEmpty()) {
            return "";
        }
        return GATILHOS_FORMULA.indexOf(valor.charAt(0)) >= 0 ? "'" + valor : valor;
    }

    /** Idem para qualquer objeto não numérico (usa {@code toString()}; {@code null} → vazio). */
    public static String textoSeguro(Object valor) {
        return valor == null ? "" : textoSeguro(valor.toString());
    }
}
