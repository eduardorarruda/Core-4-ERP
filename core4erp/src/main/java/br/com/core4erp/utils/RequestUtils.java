package br.com.core4erp.utils;

import jakarta.servlet.http.HttpServletRequest;

import java.util.UUID;

public class RequestUtils {

    private RequestUtils() {}

    public static String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    public static String resolveRequestId(HttpServletRequest request) {
        String id = request.getHeader("X-Request-ID");
        return (id != null && !id.isBlank()) ? id : UUID.randomUUID().toString().substring(0, 8);
    }
}
