package br.com.core4erp.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserUpdateRequestDto {

    @NotBlank
    private String newName;
    @NotBlank
    private String newEmail;
    @NotBlank
    private Long newPhoneNumber;
    private String username;

}
