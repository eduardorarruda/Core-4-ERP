package br.com.core4erp.utils;

import jakarta.validation.constraints.NotNull;

import java.io.Reader;
import java.io.UnsupportedEncodingException;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.net.*;
import java.sql.Clob;
import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

public class Utils {

    public static final String COMMA_SPACE = ", ";
    public static final String SPACE_LINE_SPACE = " - ";
    public static final String SEMICOLON = ";";
    public final static String LINE_SEP = System.getProperty("line.separator");
    public static final String MASK_CNPJ = "##.###.###/####-##";
    public static final String MASK_CPF = "###.###.###-##";

    private static final int[] PESO_CPF = { 11, 10, 9, 8, 7, 6, 5, 4, 3, 2 };
    private static final int[] PESO_CNPJ = { 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 };
    private static final String EMAIL_PATTERN = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$";

    public static String notNull(Object object) {
        return notNull(object, "");
    }

    public static Integer notNull(Integer integer) {
        if (integer == null) {
            return 0;
        }
        return integer;
    }

    public static boolean notNull(Boolean bool) {
        return bool != null && bool;
    }

    public static String notNull(String string) {
        return notNull(string, "");
    }

    public static String notNull(Object object, String ifNullReturn) {
        try {
            return object == null ? ifNullReturn.trim() : object.toString().trim();
        } catch (NullPointerException ex) {
            return ifNullReturn;
        }
    }

    public static BigDecimal notNull(BigDecimal value) {
        if (value == null) {
            return BigDecimal.ZERO;
        }
        return value;
    }

    public static BigInteger notNull(BigInteger value) {
        if (value == null) {
            return BigInteger.ZERO;
        }
        return value;
    }

    public static Number notNull(Number value) {
        if (value == null) {
            return 0;
        }
        return value;
    }

    public static String notNullOrEmpty(String string, String ifNullReturn) {
        try {
            return string == null || string.trim().isEmpty() ? ifNullReturn.trim() : string.toString().trim();
        } catch (NullPointerException ex) {
            return ifNullReturn;
        }
    }

    public static Integer collectionSize(Collection<?> collection) {
        return collection == null ? 0 : collection.size();
    }

    public static boolean isNull(Object object) {
        return object == null;
    }

    public static boolean isNullOrEmpty(Object object) {
        return object == null || object.toString().trim().isEmpty();
    }

    public static boolean isNullOrEmpty(Object[] object) {
        return object == null || object.length == 0;
    }

    public static boolean isNullOrEmpty(String string) {
        return string == null || string.trim().isEmpty();
    }

    public static boolean isNullOrEmpty(Collection<?> collection) {
        return collection == null || collection.isEmpty();
    }

    public static boolean isNullOrEmpty(List<Object> list) {
        AtomicBoolean result = new AtomicBoolean(false);
        list.forEach(o -> {
            if (Utils.isNullOrEmpty(o) == Boolean.TRUE) {
                result.set(true);
            }
        });
        return result.get();
    }

    public static boolean isNullOrZero(Object number) {
        if (!isNull(number)) {
            BigDecimal bd = new BigDecimal(number.toString());
            return bd.compareTo(BigDecimal.ZERO) == 0;
        }
        return true;
    }

    public static String[] disconcatStr(String separator, String value) {
        String[] split = value.split(separator);
        for (int i = 0; i < split.length; i++) {
            split[i] = split[i].trim();
        }
        return split;
    }

    public static String concatStr(String separator, String... strings) {
        if (strings == null || strings.length <= 0) {
            return "";
        }
        String result = "";
        boolean first = true;
        for (String current : strings) {
            if (current == null || current.trim().isEmpty()) {
                continue;
            }
            if (first) {
                result += current.trim();
                first = false;
            } else {
                result += separator + current.trim();
            }
        }
        return result;
    }

    public static String[] objArrayToStrArray(Object[] objects) {
        List<String> result = new ArrayList<>();
        for (Object current : objects) {
            if (current == null) {
                current = "NULL";
            }
            result.add(current.toString());
        }
        return result.toArray(new String[result.size()]);
    }

    public static String formatStr(String message, Object... args) {
        if (args == null) {
            return message;
        }
        return String.format(message.replace("{}", "%s"), (Object[]) objArrayToStrArray(args));
    }

    public static String generateNickname(String nome) {
        String nomeExibicaoTemp = "";
        try {
            String[] vetNome = nome.split(" ");
            Integer size = vetNome.length;
            if (size > 1) {
                Integer i = 0;
                Integer j = 0;
                do {
                    if (vetNome[i].length() <= 2) {
                    } else if (j >= 2
                            || size <= i) {
                        break;
                    } else {
                        nomeExibicaoTemp += vetNome[i] + " ";
                        j++;
                    }
                    i++;
                } while (true);
            }
            Integer length = nomeExibicaoTemp.length();
            return nomeExibicaoTemp.substring(0, length > 18 ? 18 : length).trim();
        } catch (Exception e) {
            return nome.trim();
        }
    }

    public static String removeAccents(String text) {
        return text == null ? null
                : Normalizer.normalize(text, Normalizer.Form.NFD)
                        .replaceAll("\\p{InCombiningDiacriticalMarks}+", "").trim();
    }

    public static String onlyNumbers(String text) {
        return text == null ? null
                : text.replaceAll("[^0-9]+", "").trim();
    }

    public static char onlyNumbers(char character) {
        String text = String.valueOf(character);
        text = text.replaceAll("[^0-9]+", "");
        return text.trim().isEmpty() ? null : text.toCharArray()[0];
    }

    public static char onlyLetters(char character, boolean removeAccents) {
        String text = String.valueOf(character);
        text = onlyLetters(text, removeAccents);
        return text.trim().isEmpty() ? null : text.toCharArray()[0];
    }

    public static String onlyLetters(String text, boolean removeAccents) {
        if (removeAccents) {
            return text == null ? null
                    : removeAccents(text.replaceAll("[^\\p{L}]+", "")).trim();
        }
        return text == null ? null
                : text.replaceAll("[^\\p{L}]+", "");
    }

    public static String removeNumbers(String text) {
        return text == null ? null
                : text.replaceAll("[0-9]+", "");
    }

    public static String onlyLettersAndSpaces(String text, boolean removeAccents) {
        if (removeAccents) {
            return text == null ? null
                    : removeAccents(text).replaceAll("[^a-zA-Z\\s]", "").trim();
        }
        return text == null ? null
                : text.replaceAll("[^a-zA-Z\\s]", "").trim();
    }

    public static String onlyNumbersAndLetters(String text, boolean removeAccents) {
        if (removeAccents) {
            return text == null ? null
                    : removeAccents(text).replaceAll("[^\\p{L}\\p{Nd}]+", "").trim();
        }
        return text == null ? null
                : text.replaceAll("[^\\p{L}\\p{Nd}]+", "").trim();
    }

    public static boolean isValidCPF(String cpf) {
        if (isNullOrEmpty(cpf)) {
            return false;
        }

        String cpfTrim = onlyNumbers(cpf);
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
        if (isNullOrEmpty(cnpj)) {
            return false;
        }

        String cnpjTrim = onlyNumbers(cnpj);
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
        // Remover qualquer caractere que não seja número
        String onlyNumbers = Utils.notNull(cpf).replaceAll("\\D", "");

        // Verificar se tem 11 dígitos
        if (onlyNumbers.length() != 11) {
            return cpf;
        }

        // Aplicar a máscara mantendo o formato padrão
        return String.format("***.%s.%s-**",
                onlyNumbers.substring(3, 6),
                onlyNumbers.substring(6, 9));
    }

    public static boolean isValidEmail(String email) {
        Pattern pattern = Pattern.compile(EMAIL_PATTERN);
        return pattern.matcher(email).matches();
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
        return mask(onlyNumbers(number), mask);
    }

    public static String substring(String string, int end) {
        return substring(string, 0, end);
    }

    public static String substring(String string, int start, int end) {
        string = Utils.notNull(string);
        if (start >= end
                || string.length() < end) {
            return string;
        }
        return string.substring(start, end);
    }

    public static boolean compare(String text, String... values) {
        for (String value : values) {
            if (text.equals(value)) {
                return true;
            }
        }
        return false;
    }

    public static String maskSocialNumberIfNecessary(String socialNumber) {
        if (socialNumber.length() == 11) {
            socialNumber = socialNumber.substring(0, 3) + "******" + socialNumber.substring(9);
        }
        return socialNumber;
    }

    // PRIVATE METHODS
    private static int calcularDigito(String str, int[] peso) {
        int soma = 0;
        for (int indice = str.length() - 1, digito; indice >= 0; indice--) {
            digito = Integer.parseInt(str.substring(indice, indice + 1));
            soma += digito * peso[peso.length - str.length() + indice];
        }
        soma = 11 - soma % 11;
        return soma > 9 ? 0 : soma;
    }

    public static int bigDecimalToCents(BigDecimal value) {
        return value.multiply(BigDecimal.valueOf(100.0)).intValue();
    }

    public static BigDecimal centsToBigDecimal(Number value) {
        return value == null ? null : BigDecimal.valueOf(value.doubleValue() / 100);
    }

    public static String mask(String value) {
        String[] array = value.split(" ");
        StringBuilder masked = new StringBuilder();
        for (int i = 0; i < array.length; i++) {
            if (masked.length() > 0) {
                masked.append(" ");
            }
            for (int a = 0; a < array[i].length(); a++) {
                char c = array[i].charAt(a);
                if (array[i].length() >= 5) {
                    if (a < 3 || a > 8) {
                        masked.append(c);
                    } else {
                        masked.append("*");
                    }
                } else {
                    if (a < 2) {
                        masked.append(c);
                    } else {
                        masked.append("*");
                    }
                }
            }
        }
        return masked.toString();
    }

    public static String insertNinthDigitPhoneNumber(String phoneNumber) {
        String number = Utils.onlyNumbers(phoneNumber);
        return number.substring(0, 2).concat("9").concat(number.substring(2, 10));
    }

    public static String getValidUserName(String username) {
        return username == null ? null : Utils.onlyNumbersAndLetters(username, true).toLowerCase();
    }

    public static String nullIfEmpty(String value) {
        return value == null || value.trim().length() == 0 ? null : value.trim();
    }

    public static Map<String, String> extractPhoneData(String phoneNumber) {
        Map<String, String> phoneData = new HashMap<>();

        // Se o telefone começa com + então é internacional
        String[] dados = phoneNumber.split(" ");
        if (phoneNumber.startsWith("+")) {
            if (dados.length == 3) {
                phoneData.put("ddi", onlyNumbers(dados[0]));
                phoneData.put("ddd", onlyNumbers(dados[1]));
                phoneData.put("number", onlyNumbers(dados[2]));
            } else if (dados.length == 4) {
                phoneData.put("ddi", onlyNumbers(dados[0]));
                phoneData.put("ddd", onlyNumbers(dados[1]));
                phoneData.put("number", onlyNumbers(dados[2]).concat(onlyNumbers(dados[3])));
            }
        } else {
            if (dados.length == 2) {
                phoneData.put("ddi", "55");
                phoneData.put("ddd", onlyNumbers(dados[0]));
                phoneData.put("number", onlyNumbers(dados[1]));
            }
        }

        // Se após a extração ainda não houver dados utiliza o método antigo
        if (phoneData.isEmpty()) {
            phoneData.put("ddi", "55");
            phoneData.put("ddd", extractDDD(phoneNumber));
            phoneData.put("number", removeDDD(phoneNumber));
        }

        return phoneData;
    }

    public static String extractDDD(String phoneNumber) {
        String ddd = phoneNumber.substring(0, 2); // os dois primeiros caracteres representam o DDD
        return ddd;
    }

    public static String removeDDD(String phoneNumber) {
        String number = phoneNumber.substring(2); // remove os dois primeiros caracteres (DDD)
        return number;
    }

    public static String formatMobilePhoneNumber(String phoneNumber) {
        String numberWithoutDDD = phoneNumber.substring(2); // remove os dois primeiros caracteres (DDD)
        if (numberWithoutDDD.length() == 8) {
            return "9" + numberWithoutDDD;
        }
        return numberWithoutDDD;
    }

    public static String formatPhoneNumber(String phoneNumber) {
        String numberWithoutDDD = phoneNumber.substring(2); // remove os dois primeiros caracteres (DDD)
        if (numberWithoutDDD.length() == 9) {
            return numberWithoutDDD.substring(1); // retira o primeiro caractere
        }
        return numberWithoutDDD;
    }

    public static String identifyBannerCard(String cardNumber) {
        if (cardNumber.replace(" ", "").matches("^4[0-9]{12}(?:[0-9]{3})?$")) {
            return "Visa";
        } else if (cardNumber.replace(" ", "").matches("^5[1-5][0-9]{14}$")) {
            return "Mastercard";
        } else if (cardNumber.replace(" ", "").matches("^3[47][0-9]{13}$")) {
            return "American Express";
        } else if (cardNumber.replace(" ", "")
                .matches("^((636368)|(438935)|(504175)|(451416)|(636297)|(5067)|(4576)|(4011))[0-9]{10}$")) {
            return "Elo";
        } else {
            return "Hipercard";
        }
    }

    public static String truncateString(String str, int maxLength) {
        if (notNull(str).length() <= maxLength) {
            return str;
        } else {
            return str.substring(0, maxLength);
        }
    }

    public static boolean isUUID(String codigo) {
        String regex = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";
        return Pattern.matches(regex, codigo);
    }

    public static String abbreviateNameForCreditCard(String name, int maxLength, int maxSplits) {
        name = name.toUpperCase();
        name = name.replaceAll("(\\s+LTDA$)", "");
        name = onlyLettersAndSpaces(name.trim(), true);
        if (name.length() <= maxLength) {
            return name;
        }

        String[] splited = name.split(" ");

        int middleNamesCount = 0;
        if (splited.length > 1) {
            for (int i = 1; i < splited.length - 1; i++) {
                if (!splited[i].isEmpty()) {
                    middleNamesCount++;
                }
            }
        }

        String firstName = splited[0];
        if (splited.length > 1) {
            String lastName = splited[splited.length - 1];
            if (!firstName.isEmpty()
                    && firstName.length() + 1 + (middleNamesCount * 2) + lastName.length() <= maxLength) { // verifica
                                                                                                           // se cabe
                                                                                                           // primeiro
                                                                                                           // nome,
                                                                                                           // abreviações
                                                                                                           // e Ultimo
                                                                                                           // nome
                StringBuilder sb = new StringBuilder(lastName);
                // System.out.println("----");
                for (int i = splited.length - 2; i > 0; i--) {// itera do penultimo nome até o segundo
                    if (!splited[i].isEmpty() && firstName.length() + 1 + sb.length() + splited[i].length() + 1
                            + ((middleNamesCount - 1) * 2) <= maxLength) { // verifica se o split possui caracteres, e
                                                                           // se a soma dele com o espaço, primeiro e
                                                                           // ultimo nome cabem completamente
                        sb.insert(0, " ").insert(0, splited[i]);
                    } else if (!splited[i].isEmpty() && sb.length() + 2 <= maxLength) {
                        sb.insert(0, " ").insert(0, splited[i].charAt(0));
                    }
                }
                sb.insert(0, " ").insert(0, firstName);

                return sb.toString().trim();
            } else {
                StringBuilder sb = new StringBuilder(firstName);
                // System.out.println("====");
                for (int i = 1; i < splited.length - 1 && i < maxSplits; i++) {
                    if (!splited[i].isEmpty() && sb.length() + 2 <= maxLength) {
                        sb.append(" ").append(splited[i].charAt(0));
                    }

                }
                if (sb.length() + lastName.length() + 1 <= maxLength) {
                    sb.append(" ").append(lastName);
                } else if (sb.length() + 2 <= maxLength) {
                    sb.append(" ").append(lastName.charAt(0));
                }

                return sb.toString();
            }
        }

        if (firstName.length() > maxLength) {
            return firstName.substring(0, maxLength);
        } else {
            return firstName;
        }
    }

    public static String addLeadingZeros(String str, int n) {
        while (str.length() < n) {
            str = "0" + str;
        }
        return str;
    }

    public static Object ifNull(Object object, Object ifNull, Object ifNotNull) {
        return object == null ? ifNull : ifNotNull;
    }

    public static boolean validatePhoneNumberPix(String phoneNumber, String dddList) {
        String number = Utils.onlyNumbers(phoneNumber);
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

    public static Boolean validateIpAddress(String ip) {
        if (isIPv4(ip)) {
            return true;
        }
        return isIPv6(ip);
    }

    private static boolean isIPv4(String input) {
        try {
            InetAddress inetAddress = InetAddress.getByName(input);
            return (inetAddress instanceof Inet4Address) && inetAddress.getHostAddress().equals(input);
        } catch (UnknownHostException ex) {
            return false;
        }
    }

    private static boolean isIPv6(String input) {
        try {
            InetAddress inetAddress = InetAddress.getByName(input);
            return (inetAddress instanceof Inet6Address);
        } catch (UnknownHostException ex) {
            return false;
        }
    }

    public static String removeHttps(String url) {
        if (url.startsWith("https://")) {
            return url.substring(8);
        } else {
            return url;
        }
    }

    public static String urlEncode(String url) {
        try {
            return URLEncoder.encode(url, "UTF-8");
        } catch (UnsupportedEncodingException e) {
            e.printStackTrace();
            return null;
        }
    }

    public static String normalizeDomain(String domain) {
        if (isNullOrEmpty(domain)) {
            return domain;
        }

        String normalized = domain.trim().toLowerCase();

        if (normalized.startsWith("https://")) {
            normalized = normalized.substring(8);
        } else if (normalized.startsWith("http://")) {
            normalized = normalized.substring(7);
        }

        if (normalized.startsWith("www.")) {
            normalized = normalized.substring(4);
        }

        int slashIndex = normalized.indexOf('/');
        if (slashIndex != -1) {
            normalized = normalized.substring(0, slashIndex);
        }

        normalized = normalized.replaceAll("/$", "");

        return normalized.trim();
    }

    public static boolean isEqualsIgnoreCase(@NotNull String s1, String... s2) {
        for (String s : s2) {
            if (s1.equalsIgnoreCase(s.trim())) {
                return true;
            }
        }

        return false;
    }

    /**
     * Verifica em um objeto se existem atributos null, "null" ou listas vazias
     * 
     * @param obj
     * @param prefixo
     * @return
     */
    public static List<String> checkNullAttributes(Object obj, String prefixo) {
        List<String> atributosInvalidos = new ArrayList<>();

        if (obj == null) {
            atributosInvalidos.add(prefixo);
            return atributosInvalidos;
        }

        if (obj instanceof String && obj.equals("null")) {
            atributosInvalidos.add(prefixo);
            return atributosInvalidos;
        }

        if (obj instanceof Map) {
            for (Map.Entry<?, ?> entry : ((Map<?, ?>) obj).entrySet()) {
                String nomeCompleto = prefixo.isEmpty() ? entry.getKey().toString() : prefixo + "." + entry.getKey();
                Object valor = entry.getValue();

                if (valor == null || "nulo".equals(valor)) {
                    atributosInvalidos.add(nomeCompleto);
                } else {
                    atributosInvalidos.addAll(checkNullAttributes(valor, nomeCompleto));
                }
            }
        } else if (obj instanceof Collection) {
            if (((Collection<?>) obj).isEmpty()) {
                atributosInvalidos.add(prefixo);
            }
        } else if (!isPrimitiveOrWrapper(obj.getClass())) {
            // Apenas verifica objetos complexos, evitando String, Integer, etc.
            Class<?> clazz = obj.getClass();
            for (Field field : clazz.getDeclaredFields()) {
                field.setAccessible(true);
                try {
                    Object valor = field.get(obj);
                    String nomeCompleto = prefixo.isEmpty() ? field.getName() : prefixo + "." + field.getName();

                    if (valor == null || "null".equals(valor)) {
                        atributosInvalidos.add(nomeCompleto);
                    } else {
                        atributosInvalidos.addAll(checkNullAttributes(valor, nomeCompleto));
                    }
                } catch (IllegalAccessException e) {
                    e.printStackTrace();
                }
            }
        }

        return atributosInvalidos;
    }

    private static boolean isPrimitiveOrWrapper(Class<?> type) {
        return type.isPrimitive() ||
                type == String.class ||
                type == Integer.class ||
                type == Long.class ||
                type == Double.class ||
                type == Float.class ||
                type == Boolean.class ||
                type == Byte.class ||
                type == Character.class ||
                type == Short.class ||
                type == Void.class;
    }

    public static String normalizeMessage(String message) {
        String normalize = Normalizer.normalize(message, Normalizer.Form.NFD);

        // A expressão \\p{M} representa todos os caracteres de marcação.
        // Ao substituí-los por "", os acentos são removidos.
        String removeAccentuation = normalize.replaceAll("\\p{M}", "");

        // remover caracteres ocultos ou não aceitos pelo ASCII
        return removeAccentuation.replaceAll("[^\\x00-\\x7F]", "");
    }

    public static <T extends Enum<T>> T getEnumGenerics(Class<T> typeEnum, String field) {
        if (Objects.nonNull(field)) {
            try {
                return Enum.valueOf(typeEnum, field.toUpperCase());
            } catch (Exception e) {
                return null;
            }
        }
        return null;

    }

    public static <T> T normalizeTextObject(T object) {

        if (object == null)
            return null;

        Class<?> clazz = object.getClass();
        Field[] fields = clazz.getDeclaredFields();

        for (Field field : fields) {
            field.setAccessible(true);
            try {
                Object value = field.get(object);

                if (value instanceof String) {
                    String normalized = normalizeString((String) value);
                    field.set(object, normalized);
                } else if (!isJavaLangType(field.getType())) {
                    normalizeTextObject(value);
                }

            } catch (IllegalAccessException e) {
                throw new RuntimeException("Erro ao normalizar campo: " + field.getName(), e);
            }
        }
        return object;

    }

    private static String normalizeString(String value) {
        if (value == null)
            return null;

        String noAccents = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", ""); // remove acentos

        return noAccents
                .replaceAll("[;]", " ") // remove ;
                .replaceAll("[\\r\\n]", " ") // remove quebras de linha
                .trim();
    }

    private static boolean isJavaLangType(Class<?> type) {
        return type.isPrimitive()
                || type.getPackageName().startsWith("java.lang")
                || type.isEnum();
    }

    public static String maskName(String name) {
        if (name == null || name.isBlank())
            return "";

        String[] parts = name.trim().split(" ");
        String first = parts[0];

        if (first.length() <= 2) {
            return first.charAt(0) + "*";
        }

        return first.charAt(0) + "***" + first.charAt(first.length() - 1);
    }

    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 2)
            return phone;

        String digits = phone.replaceAll("\\D", "");
        if (digits.length() <= 2)
            return "**";

        return digits.substring(0, 2) + "*****" + digits.substring(digits.length() - 2);
    }

    public static String maskBirthdate(String date) {
        if (date == null || !date.contains("-"))
            return date;

        // aceita formato yyyy-MM-dd ou dd/MM/yyyy se adaptado
        if (date.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return "****-**-" + date.substring(8);
        }

        return "**/**/" + date.substring(date.length() - 4);
    }

    public static String clobToString(Clob clob) {
        if (clob == null)
            return null;
        try (Reader reader = clob.getCharacterStream()) {
            StringBuilder sb = new StringBuilder();
            char[] buffer = new char[2048];
            int bytesRead;
            while ((bytesRead = reader.read(buffer)) != -1) {
                sb.append(buffer, 0, bytesRead);
            }
            return sb.toString();
        } catch (Exception e) {
            throw new RuntimeException("Erro ao converter CLOB", e);
        }
    }

    public static String formatToBrazilMobile(String phoneInput) {
        if (phoneInput == null || phoneInput.trim().isEmpty()) {
            throw new IllegalArgumentException("Telefone vazio ou nulo.");
        }

        // Remove tudo que nao for numero
        String digits = Utils.onlyNumbers(phoneInput);

        // Remove prefixos comuns de discagem internacional/nacional
        if (digits.startsWith("00")) {
            digits = digits.substring(2);
        }
        if (digits.startsWith("55") && (digits.length() == 12 || digits.length() == 13)) {
            digits = digits.substring(2);
        }
        if (digits.startsWith("0") && (digits.length() == 11 || digits.length() == 12)) {
            digits = digits.substring(1);
        }

        // Esperado apos limpeza:
        // 10 digitos -> DDD + 8 digitos (adiciona 9)
        // 11 digitos -> DDD + 9 digitos
        if (digits.length() == 10) {
            digits = digits.substring(0, 2) + "9" + digits.substring(2);
        } else if (digits.length() != 11) {
            throw new IllegalArgumentException(
                    "Telefone invalido. Use DDD + numero (8 ou 9 digitos). Recebido: " + phoneInput);
        }

        String ddd = digits.substring(0, 2);
        String mobile = digits.substring(2); // 9 digitos

        return String.format("+55 (%s) %s-%s",
                ddd,
                mobile.substring(0, 5),
                mobile.substring(5));
    }

}
