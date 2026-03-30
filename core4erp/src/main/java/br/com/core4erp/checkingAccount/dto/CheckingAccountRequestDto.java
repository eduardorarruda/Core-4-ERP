package br.com.core4erp.checkingAccount.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CheckingAccountRequestDto {

    @NotBlank
    private Long checkingAccountId;
    @NotBlank
    private String description;
    @NotBlank
    private String checkingAccountAlias;
    @NotBlank
    private BigDecimal balance;

}
