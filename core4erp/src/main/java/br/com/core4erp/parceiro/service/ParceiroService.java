package br.com.core4erp.parceiro.service;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.enums.TipoParceiro;
import br.com.core4erp.parceiro.dto.ParceiroRequestDto;
import br.com.core4erp.utils.Utils;
import br.com.core4erp.parceiro.dto.ParceiroResponseDto;
import br.com.core4erp.parceiro.entity.Parceiro;
import br.com.core4erp.parceiro.repository.ParceiroRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ParceiroService {

    private final ParceiroRepository parceiroRepository;
    private final SecurityContextUtils securityCtx;
    private final BrasilApiService brasilApiService;
    private final TenantContext tenantCtx;

    public ParceiroService(ParceiroRepository parceiroRepository,
                           SecurityContextUtils securityCtx,
                           BrasilApiService brasilApiService,
                           TenantContext tenantCtx) {
        this.parceiroRepository = parceiroRepository;
        this.securityCtx = securityCtx;
        this.brasilApiService = brasilApiService;
        this.tenantCtx = tenantCtx;
    }

    @Transactional(readOnly = true)
    public Page<ParceiroResponseDto> listar(Pageable pageable) {
        return parceiroRepository.findAllByEmpresaId(tenantCtx.getEmpresaId(), pageable)
                .map(ParceiroResponseDto::from);
    }

    @Transactional(readOnly = true)
    public ParceiroResponseDto buscarPorId(Long id) {
        return ParceiroResponseDto.from(findOwned(id));
    }

    @Requer("PARCEIRO_CRIAR") // 3.1: defense-in-depth — cobre a porta do chat IA
    @Transactional
    public ParceiroResponseDto criar(ParceiroRequestDto dto) {
        String docNormalizado = normalizarDocumento(dto.cpfCnpj());
        validarCpfCnpj(docNormalizado);
        Long empresaId = tenantCtx.getEmpresaId();
        if (docNormalizado != null && parceiroRepository.existsByCpfCnpjAndEmpresaId(docNormalizado, empresaId)) {
            throw new IllegalArgumentException("Já existe um parceiro cadastrado com este CPF/CNPJ");
        }
        Parceiro parceiro = new Parceiro();
        preencherCampos(parceiro, dto, docNormalizado);
        parceiro.setUsuario(securityCtx.getUsuario());
        enrichCnpj(parceiro);
        return ParceiroResponseDto.from(parceiroRepository.save(parceiro));
    }

    /** Altera apenas o tipo do parceiro (ex.: CLIENTE -> AMBOS), preservando os demais campos. */
    @Requer("PARCEIRO_EDITAR") // 3.1: defense-in-depth — cobre a porta do chat IA
    @Transactional
    public ParceiroResponseDto atualizarTipo(Long id, TipoParceiro tipo) {
        Parceiro parceiro = findOwned(id);
        parceiro.setTipo(tipo);
        return ParceiroResponseDto.from(parceiroRepository.save(parceiro));
    }

    @Transactional
    public ParceiroResponseDto atualizar(Long id, ParceiroRequestDto dto) {
        String docNormalizado = normalizarDocumento(dto.cpfCnpj());
        validarCpfCnpj(docNormalizado);
        Long empresaId = tenantCtx.getEmpresaId();
        if (docNormalizado != null && parceiroRepository.existsByCpfCnpjAndEmpresaIdAndIdNot(docNormalizado, empresaId, id)) {
            throw new IllegalArgumentException("Já existe um parceiro cadastrado com este CPF/CNPJ");
        }
        Parceiro parceiro = findOwned(id);
        preencherCampos(parceiro, dto, docNormalizado);
        enrichCnpj(parceiro);
        return ParceiroResponseDto.from(parceiroRepository.save(parceiro));
    }

    @Transactional
    public void deletar(Long id) {
        parceiroRepository.delete(findOwned(id));
    }

    private void preencherCampos(Parceiro p, ParceiroRequestDto dto, String docNormalizado) {
        p.setRazaoSocial(dto.razaoSocial());
        p.setNomeFantasia(dto.nomeFantasia());
        p.setCpfCnpj(docNormalizado);
        p.setTipo(dto.tipo());
        p.setLogradouro(dto.logradouro());
        p.setNumero(dto.numero());
        p.setComplemento(dto.complemento());
        p.setCep(dto.cep());
        p.setBairro(dto.bairro());
        p.setMunicipio(dto.municipio());
        p.setUf(dto.uf());
        p.setTelefone(dto.telefone());
        p.setEmail(dto.email());
    }

    private void enrichCnpj(Parceiro p) {
        String cpfCnpj = p.getCpfCnpj();
        if (cpfCnpj == null) return;
        String digits = cpfCnpj.replaceAll("[^\\d]", "");
        if (digits.length() != 14) return;

        brasilApiService.buscarCnpj(digits).ifPresent(data -> {
            if ((p.getRazaoSocial() == null || p.getRazaoSocial().isBlank()) && data.razaoSocial() != null) {
                p.setRazaoSocial(data.razaoSocial());
            }
            if (p.getNomeFantasia() == null && data.nomeFantasia() != null) p.setNomeFantasia(data.nomeFantasia());
            if (p.getLogradouro() == null && data.logradouro() != null) p.setLogradouro(data.logradouro());
            if (p.getNumero() == null && data.numero() != null) p.setNumero(data.numero());
            if (p.getComplemento() == null && data.complemento() != null) p.setComplemento(data.complemento());
            if (p.getCep() == null && data.cep() != null) p.setCep(data.cep());
            if (p.getBairro() == null && data.bairro() != null) p.setBairro(data.bairro());
            if (p.getMunicipio() == null && data.municipio() != null) p.setMunicipio(data.municipio());
            if (p.getUf() == null && data.uf() != null) p.setUf(data.uf());
            if (p.getTelefone() == null) p.setTelefone(data.telefoneFormatado());
            if (p.getEmail() == null && data.email() != null) p.setEmail(data.email());
        });
    }

    private String normalizarDocumento(String cpfCnpj) {
        if (cpfCnpj == null || cpfCnpj.isBlank()) return null;
        return cpfCnpj.replaceAll("[^\\d]", "");
    }

    private void validarCpfCnpj(String digits) {
        if (digits == null || digits.isBlank()) return;
        if (digits.length() == 11) {
            if (!Utils.isValidCPF(digits)) throw new IllegalArgumentException("CPF inválido");
        } else if (digits.length() == 14) {
            if (!Utils.isValidCNPJ(digits)) throw new IllegalArgumentException("CNPJ inválido");
        } else {
            throw new IllegalArgumentException("CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos");
        }
    }

    private Parceiro findOwned(Long id) {
        return parceiroRepository.findByIdAndEmpresaId(id, tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Parceiro não encontrado: " + id));
    }
}
