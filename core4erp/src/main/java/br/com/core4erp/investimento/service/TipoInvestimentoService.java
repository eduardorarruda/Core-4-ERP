package br.com.core4erp.investimento.service;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.investimento.dto.TipoInvestimentoRequestDto;
import br.com.core4erp.investimento.dto.TipoInvestimentoResponseDto;
import br.com.core4erp.investimento.entity.TipoInvestimentoCustom;
import br.com.core4erp.investimento.repository.TipoInvestimentoRepository;
import br.com.core4erp.utils.DtoValidator;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TipoInvestimentoService {

    private final TipoInvestimentoRepository tipoRepo;
    private final SecurityContextUtils securityCtx;
    private final TenantContext tenantCtx;
    private final DtoValidator dtoValidator;

    public TipoInvestimentoService(TipoInvestimentoRepository tipoRepo,
                                   SecurityContextUtils securityCtx,
                                   TenantContext tenantCtx,
                                   DtoValidator dtoValidator) {
        this.tipoRepo = tipoRepo;
        this.securityCtx = securityCtx;
        this.tenantCtx = tenantCtx;
        this.dtoValidator = dtoValidator;
    }

    @Requer("INVESTIMENTO_TIPO_GERENCIAR")
    @Transactional(readOnly = true)
    public List<TipoInvestimentoResponseDto> listar() {
        return tipoRepo.findAllByEmpresaId(tenantCtx.getEmpresaId())
                .stream().map(TipoInvestimentoResponseDto::from).toList();
    }

    @Requer("INVESTIMENTO_TIPO_GERENCIAR")
    @Transactional
    public TipoInvestimentoResponseDto criar(TipoInvestimentoRequestDto dto) {
        dtoValidator.validar(dto); // regra vale p/ tela E chat IA (que chama o service direto)
        TipoInvestimentoCustom t = new TipoInvestimentoCustom();
        t.setNome(dto.nome().trim());
        t.setUsuario(securityCtx.getUsuario());
        return TipoInvestimentoResponseDto.from(tipoRepo.save(t));
    }

    @Requer("INVESTIMENTO_TIPO_GERENCIAR")
    @Transactional
    public TipoInvestimentoResponseDto atualizar(Long id, TipoInvestimentoRequestDto dto) {
        dtoValidator.validar(dto);
        TipoInvestimentoCustom t = findOwned(id);
        t.setNome(dto.nome().trim());
        return TipoInvestimentoResponseDto.from(tipoRepo.save(t));
    }

    @Requer("INVESTIMENTO_TIPO_GERENCIAR")
    @Transactional
    public void deletar(Long id) {
        TipoInvestimentoCustom t = findOwned(id);
        tipoRepo.delete(t);
    }

    public TipoInvestimentoCustom findOwned(Long id) {
        return tipoRepo.findByIdAndEmpresaId(id, tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Tipo de investimento não encontrado: " + id));
    }
}
