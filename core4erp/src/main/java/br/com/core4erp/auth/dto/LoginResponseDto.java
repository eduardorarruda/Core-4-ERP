package br.com.core4erp.auth.dto;

import br.com.core4erp.empresa.dto.EmpresaResumoDto;

import java.util.List;

public record LoginResponseDto(
    MeResponseDto usuario,
    List<EmpresaResumoDto> empresas,
    Long empresaAtualId,
    Boolean senhaProvisoria,
    Boolean adminSistema
) {}
