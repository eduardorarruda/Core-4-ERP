package br.com.core4erp.parceiro.service;

import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.parceiro.dto.ParceiroRequestDto;
import br.com.core4erp.parceiro.dto.ParceiroResponseDto;
import br.com.core4erp.parceiro.entity.Parceiro;
import br.com.core4erp.parceiro.repository.ParceiroRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ParceiroService {

    private final ParceiroRepository parceiroRepository;
    private final SecurityContextUtils securityCtx;
    private final BrasilApiService brasilApiService;

    public ParceiroService(ParceiroRepository parceiroRepository,
                           SecurityContextUtils securityCtx,
                           BrasilApiService brasilApiService) {
        this.parceiroRepository = parceiroRepository;
        this.securityCtx = securityCtx;
        this.brasilApiService = brasilApiService;
    }

    public List<ParceiroResponseDto> listar() {
        return parceiroRepository.findAllByUsuarioId(securityCtx.getUsuarioId())
                .stream().map(ParceiroResponseDto::from).toList();
    }

    public ParceiroResponseDto buscarPorId(Long id) {
        return ParceiroResponseDto.from(findOwned(id));
    }

    @Transactional
    public ParceiroResponseDto criar(ParceiroRequestDto dto) {
        Parceiro parceiro = new Parceiro();
        preencherCampos(parceiro, dto);
        parceiro.setUsuario(securityCtx.getUsuario());
        enrichCnpj(parceiro);
        return ParceiroResponseDto.from(parceiroRepository.save(parceiro));
    }

    @Transactional
    public ParceiroResponseDto atualizar(Long id, ParceiroRequestDto dto) {
        Parceiro parceiro = findOwned(id);
        preencherCampos(parceiro, dto);
        enrichCnpj(parceiro);
        return ParceiroResponseDto.from(parceiroRepository.save(parceiro));
    }

    @Transactional
    public void deletar(Long id) {
        parceiroRepository.delete(findOwned(id));
    }

    private void preencherCampos(Parceiro p, ParceiroRequestDto dto) {
        p.setNome(dto.razaoSocial()); // coluna nome mantida para compatibilidade
        p.setRazaoSocial(dto.razaoSocial());
        p.setNomeFantasia(dto.nomeFantasia());
        p.setCpfCnpj(dto.cpfCnpj());
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
                p.setNome(data.razaoSocial());
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

    private Parceiro findOwned(Long id) {
        return parceiroRepository.findByIdAndUsuarioId(id, securityCtx.getUsuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Parceiro não encontrado: " + id));
    }
}
