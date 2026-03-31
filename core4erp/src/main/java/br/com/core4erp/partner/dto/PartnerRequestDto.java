package br.com.core4erp.partner.dto;

import br.com.core4erp.enums.PartnerType;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PartnerRequestDto {

    @NotBlank
    private Long partnerId;
    @NotBlank
    private String partnerName;
    @NotBlank
    private String partnerType;

}
