package br.com.core4erp.auth.dto;

public record LoginResponseDto(
        String accessToken,
        String tokenType
) {
    public LoginResponseDto(String accessToken) {
        this(accessToken, "bearer");
    }
}
