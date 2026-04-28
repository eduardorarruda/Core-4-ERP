package br.com.core4erp.contaCorrente.service;

import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteRequestDto;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteResponseDto;
import br.com.core4erp.contaCorrente.dto.TransferenciaRequestDto;
import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import br.com.core4erp.contaCorrente.repository.ContaCorrenteRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ContaCorrenteService {

    private final ContaCorrenteRepository repository;
    private final SecurityContextUtils securityCtx;

    public ContaCorrenteService(ContaCorrenteRepository repository, SecurityContextUtils securityCtx) {
        this.repository = repository;
        this.securityCtx = securityCtx;
    }

    @Transactional(readOnly = true)
    public List<ContaCorrenteResponseDto> listar() {
        return repository.findAllByUsuarioId(securityCtx.getUsuarioId())
                .stream().map(ContaCorrenteResponseDto::from).toList();
    }

    @Transactional(readOnly = true)
    public ContaCorrenteResponseDto buscarPorId(Long id) {
        return ContaCorrenteResponseDto.from(findOwned(id));
    }

    @Transactional
    public ContaCorrenteResponseDto criar(ContaCorrenteRequestDto dto) {
        Long usuarioId = securityCtx.getUsuarioId();
        if (repository.existsByNumeroContaAndUsuarioId(dto.numeroConta(), usuarioId)) {
            throw new IllegalArgumentException("Número de conta já cadastrado");
        }
        ContaCorrente conta = new ContaCorrente();
        preencherCampos(conta, dto);
        conta.setUsuario(securityCtx.getUsuario());
        return ContaCorrenteResponseDto.from(repository.save(conta));
    }

    @Transactional
    public ContaCorrenteResponseDto atualizar(Long id, ContaCorrenteRequestDto dto) {
        ContaCorrente conta = findOwned(id);
        preencherCampos(conta, dto);
        return ContaCorrenteResponseDto.from(repository.save(conta));
    }

    @Transactional
    public void deletar(Long id) {
        repository.delete(findOwned(id));
    }

    @Transactional
    public void transferir(TransferenciaRequestDto dto) {
        Long usuarioId = securityCtx.getUsuarioId();

        if (dto.contaOrigemId().equals(dto.contaDestinoId())) {
            throw new IllegalArgumentException("Conta origem e destino não podem ser iguais");
        }

        ContaCorrente origem = repository.findByIdAndUsuarioId(dto.contaOrigemId(), usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Conta origem não encontrada"));
        ContaCorrente destino = repository.findByIdAndUsuarioId(dto.contaDestinoId(), usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Conta destino não encontrada"));

        if (origem.getSaldo().compareTo(dto.valor()) < 0) {
            throw new IllegalStateException("Saldo insuficiente na conta origem");
        }

        origem.setSaldo(origem.getSaldo().subtract(dto.valor()));
        destino.setSaldo(destino.getSaldo().add(dto.valor()));

        repository.save(origem);
        repository.save(destino);
    }

    public ContaCorrente findOwned(Long id) {
        return repository.findByIdAndUsuarioId(id, securityCtx.getUsuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Conta corrente não encontrada: " + id));
    }

    private void preencherCampos(ContaCorrente c, ContaCorrenteRequestDto dto) {
        c.setNumeroConta(dto.numeroConta());
        c.setAgencia(dto.agencia());
        c.setDescricao(dto.descricao());
        c.setSaldo(dto.saldo());
        c.setDataSaldoInicial(dto.dataSaldoInicial());
        c.setPermitirSaldoNegativo(Boolean.TRUE.equals(dto.permitirSaldoNegativo()));
    }
}
