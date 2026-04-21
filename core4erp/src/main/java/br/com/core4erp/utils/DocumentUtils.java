package br.com.core4erp.utils;

import java.util.regex.Pattern;

public class DocumentUtils {

    public static final String MASK_CNPJ = "##.###.###/####-##";
    public static final String MASK_CPF = "###.###.###-##";

    private static final int[] PESO_CPF = {11, 10, 9, 8, 7, 6, 5, 4, 3, 2};
    private static final int[] PESO_CNPJ = {6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
    private static final String EMAIL_PATTERN = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$";

    public static boolean isValidCPF(String cpf) {
        if (StringUtils.isNullOrEmpty(cpf)) {
            return false;
        }
        String cpfTrim = StringUtils.onlyNumbers(cpf);
        if (cpfTrim.length() != 11) {
            return false;
        }
        if (cpfTrim.matches("(\\d)\\1{10}")) {
            return false;
        }
        Integer digito1 = calcularDigito(cpfTrim.substring(0, 9), PESO_CPF);
        Integer digito2 = calcularDigito(cpfTrim.substring(0, 9) + digito1, PESO_CPF);
        return cpfTrim.equals(cpfTrim.substring(0, 9) + digito1.toString() + digito2.toString());
    }

    public static boolean isValidCNPJ(String cnpj) {
        if (StringUtils.isNullOrEmpty(cnpj)) {
            return false;
        }
        String cnpjTrim = StringUtils.onlyNumbers(cnpj);
        if (cnpjTrim.length() != 14) {
            return false;
        }
        if (cnpjTrim.matches("(\\d)\\1{13}")) {
            return false;
        }
        Integer digito1 = calcularDigito(cnpjTrim.substring(0, 12), PESO_CNPJ);
        Integer digito2 = calcularDigito(cnpjTrim.substring(0, 12) + digito1, PESO_CNPJ);
        return cnpjTrim.equals(cnpjTrim.substring(0, 12) + digito1.toString() + digito2.toString());
    }

    public static boolean isValidEmail(String email) {
        Pattern pattern = Pattern.compile(EMAIL_PATTERN);
        return pattern.matcher(email).matches();
    }

    public static String mask(String value, String mask) {
        try {
            int index = 0;
            StringBuilder masked = new StringBuilder();
            for (int i = 0; i < mask.length(); i++) {
                char c = mask.charAt(i);
                if (c == '#') {
                    masked.append(value.charAt(index));
                    index++;
                } else if (c == 'x') {
                    masked.append(c);
                    index++;
                } else {
                    masked.append(c);
                }
            }
            return masked.toString();
        } catch (Exception ignored) {
        }
        return value;
    }

    public static String maskCpf(String cpf) {
        String onlyNumbers = StringUtils.notNull(cpf).replaceAll("\\D", "");
        if (onlyNumbers.length() != 11) {
            return cpf;
        }
        return String.format("***.%s.%s-**",
                onlyNumbers.substring(3, 6),
                onlyNumbers.substring(6, 9));
    }

    public static String emailMask(String email) {
        if (email == null || email.isEmpty()) {
            return email;
        }
        int length = email.length();
        int start = length / 3;
        int end = (length * 2) / 3;
        StringBuilder masked = new StringBuilder();
        for (int i = 0; i < length; i++) {
            masked.append((i > start && i < end) ? "*" : email.charAt(i));
        }
        return masked.toString();
    }

    public static String maskNumber(String number, String mask) {
        return mask(StringUtils.onlyNumbers(number), mask);
    }

    public static String maskSocialNumberIfNecessary(String socialNumber) {
        if (socialNumber.length() == 11) {
            socialNumber = socialNumber.substring(0, 3) + "******" + socialNumber.substring(9);
        }
        return socialNumber;
    }

    private static int calcularDigito(String str, int[] peso) {
        int soma = 0;
        for (int indice = str.length() - 1, digito; indice >= 0; indice--) {
            digito = Integer.parseInt(str.substring(indice, indice + 1));
            soma += digito * peso[peso.length - str.length() + indice];
        }
        soma = 11 - soma % 11;
        return soma > 9 ? 0 : soma;
    }
}
