package br.com.core4erp.assinatura.service;

import br.com.core4erp.assinatura.dto.AssinaturaRequestDto;
import br.com.core4erp.assinatura.dto.AssinaturaResponseDto;
import br.com.core4erp.assinatura.entity.Assinatura;
import br.com.core4erp.assinatura.repository.AssinaturaRepository;
import br.com.core4erp.cartaoCredito.repository.CartaoCreditoRepository;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.parceiro.repository.ParceiroRepository;
import br.com.core4erp.utils.DtoValidator;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AssinaturaService {

    private final AssinaturaRepository assinaturaRepository;
    private final CategoriaRepository categoriaRepository;
    private final ParceiroRepository parceiroRepository;
    private final CartaoCreditoRepository cartaoCreditoRepository;
    private final SecurityContextUtils securityCtx;
    private final TenantContext tenantCtx;
    private final DtoValidator dtoValidator;

    public AssinaturaService(AssinaturaRepository assinaturaRepository,
                             CategoriaRepository categoriaRepository,
                             ParceiroRepository parceiroRepository,
                             CartaoCreditoRepository cartaoCreditoRepository,
                             SecurityContextUtils securityCtx,
                             TenantContext tenantCtx,
                             DtoValidator dtoValidator) {
        this.assinaturaRepository = assinaturaRepository;
        this.categoriaRepository = categoriaRepository;
        this.parceiroRepository = parceiroRepository;
        this.cartaoCreditoRepository = cartaoCreditoRepository;
        this.securityCtx = securityCtx;
        this.tenantCtx = tenantCtx;
        this.dtoValidator = dtoValidator;
    }

    @Transactional(readOnly = true)
    public List<AssinaturaResponseDto> listar() {
        return assinaturaRepository.findAllByEmpresaId(tenantCtx.getEmpresaId())
                .stream()
                .map(AssinaturaResponseDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssinaturaResponseDto buscarPorId(Long id) {
        return AssinaturaResponseDto.from(findOwned(id));
    }

    @Requer("ASSINATURA_CRIAR")
    @Transactional
    public AssinaturaResponseDto criar(AssinaturaRequestDto dto) {
        dtoValidator.validar(dto);
        Long eid = tenantCtx.getEmpresaId();
        Assinatura assinatura = new Assinatura();
        assinatura.setDescricao(dto.descricao());
        assinatura.setValor(dto.valor());
        assinatura.setDiaVencimento(dto.diaVencimento());
        assinatura.setAtiva(dto.ativa() != null ? dto.ativa() : true);
        assinatura.setCategoria(categoriaRepository.findByIdAndEmpresaId(dto.categoriaId(), eid)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada: " + dto.categoriaId())));
        if (dto.parceiroId() != null) {
            assinatura.setParceiro(parceiroRepository.findByIdAndEmpresaId(dto.parceiroId(), eid)
                    .orElseThrow(() -> new EntityNotFoundException("Parceiro não encontrado: " + dto.parceiroId())));
        }
        if (dto.cartaoCreditoId() != null) {
            assinatura.setCartaoCredito(cartaoCreditoRepository.findByIdAndEmpresaId(dto.cartaoCreditoId(), eid)
                    .orElseThrow(() -> new EntityNotFoundException("Cartão não encontrado: " + dto.cartaoCreditoId())));
        }
        assinatura.setUsuario(securityCtx.getUsuario());
        return AssinaturaResponseDto.from(assinaturaRepository.save(assinatura));
    }

    @Requer("ASSINATURA_EDITAR")
    @Transactional
    public AssinaturaResponseDto atualizar(Long id, AssinaturaRequestDto dto) {
        dtoValidator.validar(dto);
        Long eid = tenantCtx.getEmpresaId();
        Assinatura assinatura = findOwned(id);
        assinatura.setDescricao(dto.descricao());
        assinatura.setValor(dto.valor());
        assinatura.setDiaVencimento(dto.diaVencimento());
        if (dto.ativa() != null) assinatura.setAtiva(dto.ativa());
        assinatura.setCategoria(categoriaRepository.findByIdAndEmpresaId(dto.categoriaId(), eid)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada: " + dto.categoriaId())));
        if (dto.parceiroId() != null) {
            assinatura.setParceiro(parceiroRepository.findByIdAndEmpresaId(dto.parceiroId(), eid)
                    .orElseThrow(() -> new EntityNotFoundException("Parceiro não encontrado: " + dto.parceiroId())));
        } else {
            assinatura.setParceiro(null);
        }
        if (dto.cartaoCreditoId() != null) {
            assinatura.setCartaoCredito(cartaoCreditoRepository.findByIdAndEmpresaId(dto.cartaoCreditoId(), eid)
                    .orElseThrow(() -> new EntityNotFoundException("Cartão não encontrado: " + dto.cartaoCreditoId())));
        } else {
            assinatura.setCartaoCredito(null);
        }
        return AssinaturaResponseDto.from(assinaturaRepository.save(assinatura));
    }

    @Requer("ASSINATURA_DELETAR")
    @Transactional
    public void deletar(Long id) {
        assinaturaRepository.delete(findOwned(id));
    }

    @Transactional(readOnly = true)
    public List<AssinaturaResponseDto> listarAtivas() {
        return assinaturaRepository.findAllByEmpresaIdAndAtiva(tenantCtx.getEmpresaId(), true)
                .stream()
                .map(AssinaturaResponseDto::from)
                .toList();
    }

    private Assinatura findOwned(Long id) {
        return assinaturaRepository.findByIdAndEmpresaId(id, tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Assinatura não encontrada: " + id));
    }
}
