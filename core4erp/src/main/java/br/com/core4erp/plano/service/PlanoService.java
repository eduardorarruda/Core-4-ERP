package br.com.core4erp.plano.service;

import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.plano.dto.PlanoRequestDto;
import br.com.core4erp.plano.dto.PlanoResponseDto;
import br.com.core4erp.plano.entity.Plano;
import br.com.core4erp.plano.repository.PlanoRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlanoService {

    private final PlanoRepository planoRepository;
    private final TenantContext tenantCtx;

    @Cacheable("planos-ativos")
    public List<PlanoResponseDto> listarAtivos() {
        return planoRepository.findByAtivoTrue().stream()
            .map(this::toDto)
            .toList();
    }

    public List<PlanoResponseDto> listarTodos() {
        tenantCtx.exigirAdminSistema();
        return planoRepository.findAll().stream()
            .map(this::toDto)
            .toList();
    }

    @Transactional
    @CacheEvict(value = "planos-ativos", allEntries = true)
    public PlanoResponseDto criar(PlanoRequestDto dto) {
        tenantCtx.exigirAdminSistema();
        Plano plano = new Plano();
        plano.setNome(dto.nome().toUpperCase());
        plano.setDescricao(dto.descricao());
        plano.setPrecoMensal(dto.precoMensal());
        plano.setMaxUsuarios(dto.maxUsuarios());
        plano.setMaxEmpresas(dto.maxEmpresas());
        return toDto(planoRepository.save(plano));
    }

    @Transactional
    @CacheEvict(value = "planos-ativos", allEntries = true)
    public PlanoResponseDto atualizar(Long id, PlanoRequestDto dto) {
        tenantCtx.exigirAdminSistema();
        Plano plano = findById(id);
        plano.setNome(dto.nome().toUpperCase());
        plano.setDescricao(dto.descricao());
        plano.setPrecoMensal(dto.precoMensal());
        plano.setMaxUsuarios(dto.maxUsuarios());
        plano.setMaxEmpresas(dto.maxEmpresas());
        return toDto(planoRepository.save(plano));
    }

    @Transactional
    @CacheEvict(value = "planos-ativos", allEntries = true)
    public void desativar(Long id) {
        tenantCtx.exigirAdminSistema();
        Plano plano = findById(id);
        plano.setAtivo(false);
        planoRepository.save(plano);
    }

    @Transactional
    @CacheEvict(value = "planos-ativos", allEntries = true)
    public void reativar(Long id) {
        tenantCtx.exigirAdminSistema();
        Plano plano = findById(id);
        plano.setAtivo(true);
        planoRepository.save(plano);
    }

    private Plano findById(Long id) {
        return planoRepository.findById(id)
            .orElseThrow(() -> new EntityNotFoundException("Plano não encontrado"));
    }

    private PlanoResponseDto toDto(Plano p) {
        return new PlanoResponseDto(
            p.getId(), p.getNome(), p.getDescricao(),
            p.getPrecoMensal(), p.getMaxUsuarios(), p.getMaxEmpresas(), p.getAtivo()
        );
    }
}
