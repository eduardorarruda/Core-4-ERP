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
        p.setNome(dto.nome());
        p.setTipo(dto.tipo());
        p.setRazaoSocial(dto.razaoSocial());
        p.setNomeFantasia(dto.nomeFantasia());
        p.setCpfCnpj(dto.cpfCnpj());
        p.setEndereco(dto.endereco());
        p.setDataNascimentoFundacao(dto.dataNascimentoFundacao());
    }

    /** Enriquece via BrasilAPI quando CNPJ presente e razaoSocial/endereco ausentes. */
    private void enrichCnpj(Parceiro p) {
        String cpfCnpj = p.getCpfCnpj();
        if (cpfCnpj == null) return;
        String digits = cpfCnpj.replaceAll("[^\\d]", "");
        if (digits.length() != 14) return;
        boolean faltaRazao = p.getRazaoSocial() == null || p.getRazaoSocial().isBlank();
        boolean faltaEndereco = p.getEndereco() == null || p.getEndereco().isBlank();
        if (!faltaRazao && !faltaEndereco) return;

        brasilApiService.buscarCnpj(digits).ifPresent(data -> {
            if (faltaRazao && data.razaoSocial() != null) p.setRazaoSocial(data.razaoSocial());
            if (faltaEndereco) {
                String end = data.enderecoCompleto();
                if (!end.isBlank()) p.setEndereco(end);
            }
            if (p.getNomeFantasia() == null && data.nomeFantasia() != null) {
                p.setNomeFantasia(data.nomeFantasia());
            }
        });
    }

    private Parceiro findOwned(Long id) {
        return parceiroRepository.findByIdAndUsuarioId(id, securityCtx.getUsuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Parceiro não encontrado: " + id));
    }
}
