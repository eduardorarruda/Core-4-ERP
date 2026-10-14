package br.com.core4erp.auth.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Política ÚNICA de senha para tudo que CRIA uma senha (registro, troca, redefinição e aceite de
 * convite): mínimo de 8 caracteres com letra maiúscula, minúscula e número, e no máximo 72
 * caracteres — o BCrypt só considera 72 bytes (CVE-2025-22228). Espelha
 * {@code front-end/src/lib/senha.js}.
 *
 * <p>{@code null} é considerado válido — combine com {@code @NotBlank}. Cada regra violada gera a
 * própria mensagem (tamanho máximo ou composição).
 */
@Documented
@Constraint(validatedBy = {})
@Size(max = SenhaForte.MAX_CARACTERES, message = "A senha deve ter no máximo 72 caracteres")
@Pattern(regexp = SenhaForte.REGEX,
        message = "A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, letra minúscula e número")
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT, ElementType.ANNOTATION_TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface SenhaForte {

    int MAX_CARACTERES = 72;
    String REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$";

    String message() default "A senha deve ter de 8 a 72 caracteres, incluindo letra maiúscula, letra minúscula e número";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
