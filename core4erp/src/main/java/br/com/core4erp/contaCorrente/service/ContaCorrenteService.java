package br.com.core4erp.contaCorrente.service;

import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteRequestDto;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteResponseDto;
import br.com.core4erp.contaCorrente.dto.TransferenciaRequestDto;
import br.com.core4erp.contaCorrente.dto.TransferenciaResponseDto;
import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import br.com.core4erp.contaCorrente.entity.Transferencia;
import br.com.core4erp.contaCorrente.repository.ContaCorrenteRepository;
import br.com.core4erp.contaCorrente.repository.TransferenciaRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ContaCorrenteService {

    private final ContaCorrenteRepository repository;
    private final TransferenciaRepository transferenciaRepository;
    private final SecurityContextUtils securityCtx;

    public ContaCorrenteService(ContaCorrenteRepository repository,
                                TransferenciaRepository transferenciaRepository,
                                SecurityContextUtils securityCtx) {
        this.repository = repository;
        this.transferenciaRepository = transferenciaRepository;
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
        validarSaldo(dto);
        ContaCorrente conta = new ContaCorrente();
        preencherCampos(conta, dto);
        conta.setUsuario(securityCtx.getUsuario());
        return ContaCorrenteResponseDto.from(repository.save(conta));
    }

    @Transactional
    public ContaCorrenteResponseDto atualizar(Long id, ContaCorrenteRequestDto dto) {
        ContaCorrente conta = findOwned(id);
        validarSaldo(dto);
        preencherCampos(conta, dto);
        return ContaCorrenteResponseDto.from(repository.save(conta));
    }

    @Transactional
    public void deletar(Long id) {
        repository.delete(findOwned(id));
    }

    @Transactional
    public TransferenciaResponseDto transferir(TransferenciaRequestDto dto) {
        Long usuarioId = securityCtx.getUsuarioId();

        if (dto.contaOrigemId().equals(dto.contaDestinoId())) {
            throw new IllegalArgumentException("Conta origem e destino não podem ser iguais");
        }

        ContaCorrente origem = repository.findByIdAndUsuarioId(dto.contaOrigemId(), usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Conta origem não encontrada"));
        ContaCorrente destino = repository.findByIdAndUsuarioId(dto.contaDestinoId(), usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Conta destino não encontrada"));

        if (!Boolean.TRUE.equals(origem.getPermitirSaldoNegativo())
                && origem.getSaldo().compareTo(dto.valor()) < 0) {
            throw new IllegalStateException("Saldo insuficiente na conta origem");
        }

        origem.setSaldo(origem.getSaldo().subtract(dto.valor()));
        destino.setSaldo(destino.getSaldo().add(dto.valor()));
        repository.save(origem);
        repository.save(destino);

        Transferencia transferencia = new Transferencia();
        transferencia.setContaOrigem(origem);
        transferencia.setContaDestino(destino);
        transferencia.setValor(dto.valor());
        transferencia.setDataTransferencia(dto.dataTransferencia());
        transferencia.setUsuario(securityCtx.getUsuario());

        return TransferenciaResponseDto.from(transferenciaRepository.save(transferencia));
    }

    @Transactional(readOnly = true)
    public List<TransferenciaResponseDto> listarTransferencias() {
        return transferenciaRepository
                .findAllByUsuarioIdOrderByDataTransferenciaDesc(securityCtx.getUsuarioId())
                .stream().map(TransferenciaResponseDto::from).toList();
    }

    @Transactional
    public TransferenciaResponseDto atualizarTransferencia(Long id, TransferenciaRequestDto dto) {
        Long usuarioId = securityCtx.getUsuarioId();
        Transferencia transferencia = transferenciaRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Transferência não encontrada: " + id));

        if (dto.contaOrigemId().equals(dto.contaDestinoId())) {
            throw new IllegalArgumentException("Conta origem e destino não podem ser iguais");
        }

        // Estornar transferência antiga
        ContaCorrente origemAntiga = transferencia.getContaOrigem();
        ContaCorrente destinoAntigo = transferencia.getContaDestino();
        origemAntiga.setSaldo(origemAntiga.getSaldo().add(transferencia.getValor()));
        destinoAntigo.setSaldo(destinoAntigo.getSaldo().subtract(transferencia.getValor()));
        repository.save(origemAntiga);
        repository.save(destinoAntigo);

        // Aplicar nova transferência
        ContaCorrente novaOrigem = repository.findByIdAndUsuarioId(dto.contaOrigemId(), usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Conta origem não encontrada"));
        ContaCorrente novoDestino = repository.findByIdAndUsuarioId(dto.contaDestinoId(), usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Conta destino não encontrada"));

        if (!Boolean.TRUE.equals(novaOrigem.getPermitirSaldoNegativo())
                && novaOrigem.getSaldo().compareTo(dto.valor()) < 0) {
            throw new IllegalStateException("Saldo insuficiente na conta origem");
        }

        novaOrigem.setSaldo(novaOrigem.getSaldo().subtract(dto.valor()));
        novoDestino.setSaldo(novoDestino.getSaldo().add(dto.valor()));
        repository.save(novaOrigem);
        repository.save(novoDestino);

        transferencia.setContaOrigem(novaOrigem);
        transferencia.setContaDestino(novoDestino);
        transferencia.setValor(dto.valor());
        transferencia.setDataTransferencia(dto.dataTransferencia());

        return TransferenciaResponseDto.from(transferenciaRepository.save(transferencia));
    }

    @Transactional
    public void deletarTransferencia(Long id) {
        Long usuarioId = securityCtx.getUsuarioId();
        Transferencia transferencia = transferenciaRepository.findByIdAndUsuarioId(id, usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Transferência não encontrada: " + id));

        // Estornar saldos
        ContaCorrente origem = transferencia.getContaOrigem();
        ContaCorrente destino = transferencia.getContaDestino();
        origem.setSaldo(origem.getSaldo().add(transferencia.getValor()));
        destino.setSaldo(destino.getSaldo().subtract(transferencia.getValor()));
        repository.save(origem);
        repository.save(destino);

        transferenciaRepository.delete(transferencia);
    }

    public ContaCorrente findOwned(Long id) {
        return repository.findByIdAndUsuarioId(id, securityCtx.getUsuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Conta corrente não encontrada: " + id));
    }

    private void validarSaldo(ContaCorrenteRequestDto dto) {
        if (dto.saldo().compareTo(BigDecimal.ZERO) < 0 && !Boolean.TRUE.equals(dto.permitirSaldoNegativo())) {
            throw new IllegalArgumentException("Saldo inicial negativo requer que 'Permitir saldo negativo' esteja ativo");
        }
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
