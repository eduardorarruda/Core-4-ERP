package br.com.core4erp.creditCard.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class CreditCardRequestDto {

    @NotBlank
    private String creditCardName;
    @NotBlank
    private BigDecimal limitAmount;
    @NotBlank
    private Integer closingDay;
    @NotBlank
    private Integer dueDay;
    @NotBlank
    private Long checkingAccount;
    @NotBlank
    private Long creditCardId;

}
