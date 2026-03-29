package br.com.core4erp.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserRegisterRequestDto {
    @NotBlank
    private String name;
    @NotBlank
    private String email;
    @NotBlank
    private Long phoneNumber;
    @NotBlank
    private String username;
    @NotBlank
    private String password;
    private String role;

}
