package br.com.core4erp.empresa.dto;

import jakarta.validation.constraints.NotNull;

public record AlterarPerfilRequestDto(@NotNull Long perfilId) {}
