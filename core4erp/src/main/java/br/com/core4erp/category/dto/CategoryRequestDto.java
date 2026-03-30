package br.com.core4erp.category.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CategoryRequestDto {

    private Long id;
    private String username;
    @NotBlank
    private String description;

}
