package br.com.core4erp.config.crypto;

/**
 * Acesso estático à {@link CriptografiaCampos} para componentes que o Hibernate/JPA instancia fora
 * do Spring ({@link CampoCriptografadoConverter}) e para os setters das entidades que mantêm o
 * índice cego sincronizado. É preenchido no construtor do bean — falha clara se usado antes.
 */
public final class CriptografiaCamposHolder {

    private static volatile CriptografiaCampos instancia;

    private CriptografiaCamposHolder() {}

    static void definir(CriptografiaCampos criptografia) {
        instancia = criptografia;
    }

    public static CriptografiaCampos get() {
        CriptografiaCampos c = instancia;
        if (c == null) {
            throw new IllegalStateException("CriptografiaCampos ainda não inicializada (DATA_ENCRYPTION_KEY/DATA_HMAC_KEY).");
        }
        return c;
    }
}
