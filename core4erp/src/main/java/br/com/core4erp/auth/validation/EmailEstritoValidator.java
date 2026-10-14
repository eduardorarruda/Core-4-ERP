package br.com.core4erp.auth.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class EmailEstritoValidator implements ConstraintValidator<EmailEstrito, String> {

    static final int MAX_TOTAL = 254;
    static final int MAX_LOCAL = 64;

    /** Parte local "dot-atom" (RFC 5322, sem aspas) e domínio com ≥ 2 rótulos (exige ponto). */
    private static final Pattern FORMATO = Pattern.compile(
            "^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*"
                    + "@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
                    + "(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$");

    @Override
    public boolean isValid(String valor, ConstraintValidatorContext context) {
        return valor == null || valido(valor);
    }

    public static boolean valido(String email) {
        if (email.isEmpty() || email.length() > MAX_TOTAL) return false;
        int arroba = email.indexOf('@');
        if (arroba <= 0 || arroba != email.lastIndexOf('@') || arroba > MAX_LOCAL) return false;
        // FORMATO só aceita ASCII imprimível sem espaços, '<', '>', '"', ',' ou controles
        return FORMATO.matcher(email).matches();
    }
}
