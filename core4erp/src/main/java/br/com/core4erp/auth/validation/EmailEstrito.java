package br.com.core4erp.auth.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * E-mail em formato estrito (higiene anti-phishing), mais rígido que {@code @Email}:
 * sem nome de exibição ({@code "Fulano" <a@b.com>}), sem espaços/caracteres de controle,
 * no máximo 254 caracteres (parte local até 64) e domínio com ao menos um ponto.
 * {@code null} é considerado válido — combine com {@code @NotBlank}.
 */
@Documented
@Constraint(validatedBy = EmailEstritoValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface EmailEstrito {

    String message() default "Informe um e-mail válido, por exemplo nome@empresa.com.br";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
