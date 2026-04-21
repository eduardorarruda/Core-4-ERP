package br.com.core4erp.utils;

import java.io.UnsupportedEncodingException;
import java.net.*;

public class NetworkUtils {

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
        }
        return url;
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
        if (StringUtils.isNullOrEmpty(domain)) {
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
}