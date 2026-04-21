package br.com.core4erp.utils;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class PhoneUtils {

    public static Map<String, String> extractPhoneData(String phoneNumber) {
        Map<String, String> phoneData = new HashMap<>();

        String[] dados = phoneNumber.split(" ");
        if (phoneNumber.startsWith("+")) {
            if (dados.length == 3) {
                phoneData.put("ddi", StringUtils.onlyNumbers(dados[0]));
                phoneData.put("ddd", StringUtils.onlyNumbers(dados[1]));
                phoneData.put("number", StringUtils.onlyNumbers(dados[2]));
            } else if (dados.length == 4) {
                phoneData.put("ddi", StringUtils.onlyNumbers(dados[0]));
                phoneData.put("ddd", StringUtils.onlyNumbers(dados[1]));
                phoneData.put("number", StringUtils.onlyNumbers(dados[2]).concat(StringUtils.onlyNumbers(dados[3])));
            }
        } else {
            if (dados.length == 2) {
                phoneData.put("ddi", "55");
                phoneData.put("ddd", StringUtils.onlyNumbers(dados[0]));
                phoneData.put("number", StringUtils.onlyNumbers(dados[1]));
            }
        }

        if (phoneData.isEmpty()) {
            phoneData.put("ddi", "55");
            phoneData.put("ddd", extractDDD(phoneNumber));
            phoneData.put("number", removeDDD(phoneNumber));
        }

        return phoneData;
    }

    public static String extractDDD(String phoneNumber) {
        return phoneNumber.substring(0, 2);
    }

    public static String removeDDD(String phoneNumber) {
        return phoneNumber.substring(2);
    }

    public static String insertNinthDigitPhoneNumber(String phoneNumber) {
        String number = StringUtils.onlyNumbers(phoneNumber);
        return number.substring(0, 2).concat("9").concat(number.substring(2, 10));
    }

    public static String formatMobilePhoneNumber(String phoneNumber) {
        String numberWithoutDDD = phoneNumber.substring(2);
        if (numberWithoutDDD.length() == 8) {
            return "9" + numberWithoutDDD;
        }
        return numberWithoutDDD;
    }

    public static String formatPhoneNumber(String phoneNumber) {
        String numberWithoutDDD = phoneNumber.substring(2);
        if (numberWithoutDDD.length() == 9) {
            return numberWithoutDDD.substring(1);
        }
        return numberWithoutDDD;
    }

    public static boolean validatePhoneNumberPix(String phoneNumber, String dddList) {
        String number = StringUtils.onlyNumbers(phoneNumber);
        if (number.length() != 11) {
            return false;
        }
        if (!number.substring(2, 3).equals("9")) {
            return false;
        }
        List<String> validDdd = Arrays.asList(dddList.split(","));
        String ddd = number.substring(0, 2);
        return validDdd.contains(ddd);
    }

    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 2) return phone;
        String digits = phone.replaceAll("\\D", "");
        if (digits.length() <= 2) return "**";
        return digits.substring(0, 2) + "*****" + digits.substring(digits.length() - 2);
    }

    public static String formatToBrazilMobile(String phoneInput) {
        if (phoneInput == null || phoneInput.trim().isEmpty()) {
            throw new IllegalArgumentException("Telefone vazio ou nulo.");
        }

        String digits = StringUtils.onlyNumbers(phoneInput);

        if (digits.startsWith("00")) {
            digits = digits.substring(2);
        }
        if (digits.startsWith("55") && (digits.length() == 12 || digits.length() == 13)) {
            digits = digits.substring(2);
        }
        if (digits.startsWith("0") && (digits.length() == 11 || digits.length() == 12)) {
            digits = digits.substring(1);
        }

        if (digits.length() == 10) {
            digits = digits.substring(0, 2) + "9" + digits.substring(2);
        } else if (digits.length() != 11) {
            throw new IllegalArgumentException(
                    "Telefone invalido. Use DDD + numero (8 ou 9 digitos). Recebido: " + phoneInput
            );
        }

        String ddd = digits.substring(0, 2);
        String mobile = digits.substring(2);

        return String.format("+55 (%s) %s-%s",
                ddd,
                mobile.substring(0, 5),
                mobile.substring(5));
    }
}
