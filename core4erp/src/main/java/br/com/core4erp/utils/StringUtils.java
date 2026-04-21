package br.com.core4erp.utils;

import jakarta.validation.constraints.NotNull;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.regex.Pattern;

public class StringUtils {

    public static final String COMMA_SPACE = ", ";
    public static final String SPACE_LINE_SPACE = " - ";
    public static final String SEMICOLON = ";";
    public static final String LINE_SEP = System.getProperty("line.separator");

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
            return string == null || string.trim().isEmpty() ? ifNullReturn.trim() : string.trim();
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
            if (StringUtils.isNullOrEmpty(o)) {
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

    public static String nullIfEmpty(String value) {
        return value == null || value.trim().length() == 0 ? null : value.trim();
    }

    public static Object ifNull(Object object, Object ifNull, Object ifNotNull) {
        return object == null ? ifNull : ifNotNull;
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
                    } else if (j >= 2 || size <= i) {
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

    public static String substring(String string, int end) {
        return substring(string, 0, end);
    }

    public static String substring(String string, int start, int end) {
        string = StringUtils.notNull(string);
        if (start >= end || string.length() < end) {
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

    public static boolean isEqualsIgnoreCase(@NotNull String s1, String... s2) {
        for (String s : s2) {
            if (s1.equalsIgnoreCase(s.trim())) {
                return true;
            }
        }
        return false;
    }

    public static String addLeadingZeros(String str, int n) {
        while (str.length() < n) {
            str = "0" + str;
        }
        return str;
    }

    public static String truncateString(String str, int maxLength) {
        if (notNull(str).length() <= maxLength) {
            return str;
        }
        return str.substring(0, maxLength);
    }

    public static boolean isUUID(String codigo) {
        String regex = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";
        return Pattern.matches(regex, codigo);
    }

    public static String normalizeMessage(String message) {
        String normalize = Normalizer.normalize(message, Normalizer.Form.NFD);
        String removeAccentuation = normalize.replaceAll("\\p{M}", "");
        return removeAccentuation.replaceAll("[^\\x00-\\x7F]", "");
    }

    public static <T> T normalizeTextObject(T object) {
        if (object == null) return null;

        Class<?> clazz = object.getClass();
        Field[] fields = clazz.getDeclaredFields();

        for (Field field : fields) {
            field.setAccessible(true);
            try {
                Object value = field.get(object);
                if (value instanceof String) {
                    field.set(object, normalizeString((String) value));
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
        if (value == null) return null;
        String noAccents = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return noAccents
                .replaceAll("[;]", " ")
                .replaceAll("[\\r\\n]", " ")
                .trim();
    }

    private static boolean isJavaLangType(Class<?> type) {
        return type.isPrimitive()
                || type.getPackageName().startsWith("java.lang")
                || type.isEnum();
    }

    public static String maskName(String name) {
        if (name == null || name.isBlank()) return "";
        String[] parts = name.trim().split(" ");
        String first = parts[0];
        if (first.length() <= 2) {
            return first.charAt(0) + "*";
        }
        return first.charAt(0) + "***" + first.charAt(first.length() - 1);
    }

    public static String maskBirthdate(String date) {
        if (date == null || !date.contains("-")) return date;
        if (date.matches("\\d{4}-\\d{2}-\\d{2}")) {
            return "****-**-" + date.substring(8);
        }
        return "**/**/" + date.substring(date.length() - 4);
    }

    public static String getValidUserName(String username) {
        return username == null ? null : StringUtils.onlyNumbersAndLetters(username, true).toLowerCase();
    }
}
