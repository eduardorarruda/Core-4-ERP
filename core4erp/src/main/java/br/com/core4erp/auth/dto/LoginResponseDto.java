package br.com.core4erp.auth.dto;

public record LoginResponseDto(
        String accessToken,
        String tokenType,
        MeResponseDto usuario
) {
    public LoginResponseDto(String accessToken, MeResponseDto usuario) {
        this(accessToken, "bearer", usuario);
    }
}
