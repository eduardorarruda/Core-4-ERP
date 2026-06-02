package br.com.core4erp.categoria.service;

import br.com.core4erp.categoria.dto.CategoriaRequestDto;
import br.com.core4erp.categoria.dto.CategoriaResponseDto;
import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoriaService {

    private final CategoriaRepository categoriaRepository;
    private final SecurityContextUtils securityCtx;
    private final TenantContext tenantCtx;

    public CategoriaService(CategoriaRepository categoriaRepository,
                            SecurityContextUtils securityCtx,
                            TenantContext tenantCtx) {
        this.categoriaRepository = categoriaRepository;
        this.securityCtx = securityCtx;
        this.tenantCtx = tenantCtx;
    }

    @Requer("CATEGORIA_VISUALIZAR")
    @Transactional(readOnly = true)
    public Page<CategoriaResponseDto> listar(Pageable pageable) {
        return categoriaRepository.findAllByEmpresaId(tenantCtx.getEmpresaId(), pageable)
                .map(CategoriaResponseDto::from);
    }

    @Requer("CATEGORIA_VISUALIZAR")
    @Transactional(readOnly = true)
    public CategoriaResponseDto buscarPorId(Long id) {
        return CategoriaResponseDto.from(findOwned(id));
    }

    @Requer("CATEGORIA_CRIAR")
    @Transactional
    public CategoriaResponseDto criar(CategoriaRequestDto dto) {
        Categoria categoria = new Categoria();
        categoria.setDescricao(dto.descricao());
        categoria.setIcone(dto.icone());
        categoria.setUsuario(securityCtx.getUsuario());
        return CategoriaResponseDto.from(categoriaRepository.save(categoria));
    }

    @Requer("CATEGORIA_EDITAR")
    @Transactional
    public CategoriaResponseDto atualizar(Long id, CategoriaRequestDto dto) {
        Categoria categoria = findOwned(id);
        categoria.setDescricao(dto.descricao());
        categoria.setIcone(dto.icone());
        return CategoriaResponseDto.from(categoriaRepository.save(categoria));
    }

    @Requer("CATEGORIA_DELETAR")
    @Transactional
    public void deletar(Long id) {
        Categoria categoria = findOwned(id);
        categoriaRepository.delete(categoria);
    }

    private Categoria findOwned(Long id) {
        return categoriaRepository.findByIdAndEmpresaId(id, tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada: " + id));
    }
}
