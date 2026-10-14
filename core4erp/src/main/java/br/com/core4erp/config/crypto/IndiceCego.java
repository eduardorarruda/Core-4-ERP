package br.com.core4erp.config.crypto;

import java.util.Locale;

/**
 * Normalização + índice cego (HMAC) dos campos cifrados pesquisáveis. A normalização precisa ser a
 * MESMA na gravação (setter da entidade) e na busca (repositório) — por isso fica centralizada aqui.
 */
public final class IndiceCego {

    private IndiceCego() {}

    /** CPF/CNPJ: só dígitos. Sem dígitos → {@code null}. */
    public static String documento(String cpfCnpj) {
        String digitos = normalizarDocumento(cpfCnpj);
        return digitos == null ? null : CriptografiaCamposHolder.get().indiceCego("doc:" + digitos);
    }

    /** Número de conta bancária: sem espaços nas bordas, maiúsculas (dígito "X"). Vazio → {@code null}. */
    public static String numeroConta(String numeroConta) {
        if (numeroConta == null || numeroConta.isBlank()) {
            return null;
        }
        return CriptografiaCamposHolder.get().indiceCego("conta:" + numeroConta.strip().toUpperCase(Locale.ROOT));
    }

    /**
     * Identificador da conta do cartão no OFX (ACCTID), usado para casar o arquivo com o cartão.
     * Mesma normalização do número de conta, em domínio separado ("cartao-ofx:"). Vazio → {@code null}.
     */
    public static String acctIdCartao(String acctId) {
        if (acctId == null || acctId.isBlank()) {
            return null;
        }
        return CriptografiaCamposHolder.get().indiceCego("cartao-ofx:" + acctId.strip().toUpperCase(Locale.ROOT));
    }

    static String normalizarDocumento(String cpfCnpj) {
        if (cpfCnpj == null) {
            return null;
        }
        String digitos = cpfCnpj.replaceAll("\\D", "");
        return digitos.isEmpty() ? null : digitos;
    }
}
