package br.com.core4erp.config.crypto;

/** Chaves FIXAS apenas para testes (nunca usar fora de src/test). */
public final class CryptoTestKeys {

    /** 32 bytes (0x00..0x1f) em base64. */
    public static final String CHAVE_CIFRA = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=";
    /** 32 bytes (0x20..0x3f) em base64. */
    public static final String CHAVE_HMAC = "ICEiIyQlJicoKSorLC0uLzAxMjM0NTY3ODk6Ozw9Pj8=";

    private CryptoTestKeys() {}

    /** Cria (e registra no holder) uma instância com as chaves de teste. */
    public static CriptografiaCampos inicializar() {
        return new CriptografiaCampos(CHAVE_CIFRA, CHAVE_HMAC);
    }
}
