package br.com.core4erp.user.dto;

import lombok.Data;

@Data
public class UserResponseDto {
    private Long id;
    private String name;
    private String email;
    private Long phoneNumber;
}
