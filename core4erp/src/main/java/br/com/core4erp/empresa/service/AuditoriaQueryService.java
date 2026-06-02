package br.com.core4erp.empresa.service;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.dto.AuditoriaResponseDto;
import br.com.core4erp.empresa.entity.AcaoAuditoria;
import br.com.core4erp.empresa.repository.AuditoriaRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AuditoriaQueryService {

    private final AuditoriaRepository auditoriaRepository;
    private final TenantContext tenantCtx;

    @Requer("AUDITORIA_VISUALIZAR")
    public Page<AuditoriaResponseDto> filtrar(
            String entidade, Long entidadeId, AcaoAuditoria acao,
            Long usuarioId, LocalDate dataInicio, LocalDate dataFim,
            Pageable pageable) {

        tenantCtx.exigirContaEmpresa();

        LocalDateTime inicio = dataInicio != null ? dataInicio.atStartOfDay() : null;
        LocalDateTime fim = dataFim != null ? dataFim.atTime(23, 59, 59) : null;

        return auditoriaRepository.filtrar(
            tenantCtx.getEmpresaId(), entidade, entidadeId, acao,
            usuarioId, inicio, fim, pageable
        ).map(AuditoriaResponseDto::from);
    }
}
