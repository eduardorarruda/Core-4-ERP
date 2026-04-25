package br.com.core4erp.assinatura.service;

import br.com.core4erp.assinatura.dto.AssinaturaRequestDto;
import br.com.core4erp.assinatura.dto.AssinaturaResponseDto;
import br.com.core4erp.assinatura.entity.Assinatura;
import br.com.core4erp.assinatura.repository.AssinaturaRepository;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.parceiro.repository.ParceiroRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AssinaturaService {

    private final AssinaturaRepository assinaturaRepository;
    private final CategoriaRepository categoriaRepository;
    private final ParceiroRepository parceiroRepository;
    private final SecurityContextUtils securityCtx;

    public AssinaturaService(AssinaturaRepository assinaturaRepository,
                             CategoriaRepository categoriaRepository,
                             ParceiroRepository parceiroRepository,
                             SecurityContextUtils securityCtx) {
        this.assinaturaRepository = assinaturaRepository;
        this.categoriaRepository = categoriaRepository;
        this.parceiroRepository = parceiroRepository;
        this.securityCtx = securityCtx;
    }

    @Transactional(readOnly = true)
    public List<AssinaturaResponseDto> listar() {
        Long uid = securityCtx.getUsuarioId();
        return assinaturaRepository.findAllByUsuarioId(uid)
                .stream()
                .map(AssinaturaResponseDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssinaturaResponseDto buscarPorId(Long id) {
        return AssinaturaResponseDto.from(findOwned(id));
    }

    @Transactional
    public AssinaturaResponseDto criar(AssinaturaRequestDto dto) {
        Long uid = securityCtx.getUsuarioId();
        Assinatura assinatura = new Assinatura();
        assinatura.setDescricao(dto.descricao());
        assinatura.setValor(dto.valor());
        assinatura.setDiaVencimento(dto.diaVencimento());
        assinatura.setAtiva(dto.ativa() != null ? dto.ativa() : true);
        assinatura.setCategoria(categoriaRepository.findByIdAndUsuarioId(dto.categoriaId(), uid)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada: " + dto.categoriaId())));
        if (dto.parceiroId() != null) {
            assinatura.setParceiro(parceiroRepository.findByIdAndUsuarioId(dto.parceiroId(), uid)
                    .orElseThrow(() -> new EntityNotFoundException("Parceiro não encontrado: " + dto.parceiroId())));
        }
        assinatura.setUsuario(securityCtx.getUsuario());
        return AssinaturaResponseDto.from(assinaturaRepository.save(assinatura));
    }

    @Transactional
    public AssinaturaResponseDto atualizar(Long id, AssinaturaRequestDto dto) {
        Long uid = securityCtx.getUsuarioId();
        Assinatura assinatura = findOwned(id);
        assinatura.setDescricao(dto.descricao());
        assinatura.setValor(dto.valor());
        assinatura.setDiaVencimento(dto.diaVencimento());
        if (dto.ativa() != null) assinatura.setAtiva(dto.ativa());
        assinatura.setCategoria(categoriaRepository.findByIdAndUsuarioId(dto.categoriaId(), uid)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada: " + dto.categoriaId())));
        if (dto.parceiroId() != null) {
            assinatura.setParceiro(parceiroRepository.findByIdAndUsuarioId(dto.parceiroId(), uid)
                    .orElseThrow(() -> new EntityNotFoundException("Parceiro não encontrado: " + dto.parceiroId())));
        } else {
            assinatura.setParceiro(null);
        }
        return AssinaturaResponseDto.from(assinaturaRepository.save(assinatura));
    }

    @Transactional
    public void deletar(Long id) {
        assinaturaRepository.delete(findOwned(id));
    }

    @Transactional(readOnly = true)
    public List<AssinaturaResponseDto> listarAtivas() {
        Long uid = securityCtx.getUsuarioId();
        return assinaturaRepository.findAllByUsuarioIdAndAtiva(uid, true)
                .stream()
                .map(AssinaturaResponseDto::from)
                .toList();
    }

    private Assinatura findOwned(Long id) {
        Long uid = securityCtx.getUsuarioId();
        return assinaturaRepository.findByIdAndUsuarioId(id, uid)
                .orElseThrow(() -> new EntityNotFoundException("Assinatura não encontrada: " + id));
    }
}
