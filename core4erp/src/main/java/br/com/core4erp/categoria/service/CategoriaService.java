package br.com.core4erp.categoria.service;

import br.com.core4erp.categoria.dto.CategoriaRequestDto;
import br.com.core4erp.categoria.dto.CategoriaResponseDto;
import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.config.security.SecurityContextUtils;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class CategoriaService {

    private final CategoriaRepository categoriaRepository;
    private final SecurityContextUtils securityCtx;

    public CategoriaService(CategoriaRepository categoriaRepository, SecurityContextUtils securityCtx) {
        this.categoriaRepository = categoriaRepository;
        this.securityCtx = securityCtx;
    }

    public List<CategoriaResponseDto> listar() {
        Long usuarioId = securityCtx.getUsuarioId();
        return categoriaRepository.findAllByUsuarioId(usuarioId)
                .stream().map(CategoriaResponseDto::from).toList();
    }

    public CategoriaResponseDto buscarPorId(Long id) {
        return CategoriaResponseDto.from(findOwned(id));
    }

    @Transactional
    public CategoriaResponseDto criar(CategoriaRequestDto dto) {
        Categoria categoria = new Categoria();
        categoria.setDescricao(dto.descricao());
        categoria.setIcone(dto.icone());
        categoria.setUsuario(securityCtx.getUsuario());
        return CategoriaResponseDto.from(categoriaRepository.save(categoria));
    }

    @Transactional
    public CategoriaResponseDto atualizar(Long id, CategoriaRequestDto dto) {
        Categoria categoria = findOwned(id);
        categoria.setDescricao(dto.descricao());
        categoria.setIcone(dto.icone());
        return CategoriaResponseDto.from(categoriaRepository.save(categoria));
    }

    @Transactional
    public void deletar(Long id) {
        Categoria categoria = findOwned(id);
        categoriaRepository.delete(categoria);
    }

    private Categoria findOwned(Long id) {
        Long usuarioId = securityCtx.getUsuarioId();
        return categoriaRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada: " + id));
    }
}
