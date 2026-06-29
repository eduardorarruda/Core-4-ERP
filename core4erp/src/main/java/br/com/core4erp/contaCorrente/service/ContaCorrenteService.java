package br.com.core4erp.contaCorrente.service;

import br.com.core4erp.cartaoCredito.repository.CartaoCreditoRepository;
import br.com.core4erp.conciliacao.repository.ConciliacaoRepository;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.conta.repository.ContaBaixadaRepository;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteRequestDto;
import br.com.core4erp.contaCorrente.dto.ContaCorrenteResponseDto;
import br.com.core4erp.contaCorrente.dto.TransferenciaRequestDto;
import br.com.core4erp.contaCorrente.dto.TransferenciaResponseDto;
import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import br.com.core4erp.contaCorrente.entity.Transferencia;
import br.com.core4erp.contaCorrente.repository.ContaCorrenteRepository;
import br.com.core4erp.contaCorrente.repository.TransferenciaRepository;
import br.com.core4erp.exception.BusinessException;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ContaCorrenteService {

    private final ContaCorrenteRepository repository;
    private final TransferenciaRepository transferenciaRepository;
    private final ContaBaixadaRepository contaBaixadaRepository;
    private final ConciliacaoRepository conciliacaoRepository;
    private final CartaoCreditoRepository cartaoCreditoRepository;
    private final SecurityContextUtils securityCtx;
    private final TenantContext tenantCtx;

    public ContaCorrenteService(ContaCorrenteRepository repository,
                                TransferenciaRepository transferenciaRepository,
                                ContaBaixadaRepository contaBaixadaRepository,
                                ConciliacaoRepository conciliacaoRepository,
                                CartaoCreditoRepository cartaoCreditoRepository,
                                SecurityContextUtils securityCtx,
                                TenantContext tenantCtx) {
        this.repository = repository;
        this.transferenciaRepository = transferenciaRepository;
        this.contaBaixadaRepository = contaBaixadaRepository;
        this.conciliacaoRepository = conciliacaoRepository;
        this.cartaoCreditoRepository = cartaoCreditoRepository;
        this.securityCtx = securityCtx;
        this.tenantCtx = tenantCtx;
    }

    @Transactional(readOnly = true)
    public List<ContaCorrenteResponseDto> listar() {
        return repository.findAllByEmpresaId(tenantCtx.getEmpresaId())
                .stream().map(ContaCorrenteResponseDto::from).toList();
    }

    @Transactional(readOnly = true)
    public ContaCorrenteResponseDto buscarPorId(Long id) {
        return ContaCorrenteResponseDto.from(findOwned(id));
    }

    @Transactional
    public ContaCorrenteResponseDto criar(ContaCorrenteRequestDto dto) {
        Long empresaId = tenantCtx.getEmpresaId();
        if (repository.existsByNumeroContaAndEmpresaId(dto.numeroConta(), empresaId)) {
            throw new IllegalArgumentException("Número de conta já cadastrado");
        }
        validarSaldo(dto);
        ContaCorrente conta = new ContaCorrente();
        preencherCampos(conta, dto);
        conta.setSaldo(dto.saldo()); // S.2: saldo só é definido na criação (saldo inicial)
        conta.setUsuario(securityCtx.getUsuario());
        return ContaCorrenteResponseDto.from(repository.save(conta));
    }

    @Transactional
    public ContaCorrenteResponseDto atualizar(Long id, ContaCorrenteRequestDto dto) {
        ContaCorrente conta = findOwned(id);
        // S.2: o saldo é um campo calculado (soma de lançamentos/transferências/baixas) e
        // NUNCA deve ser sobrescrito por um update direto. preencherCampos não toca no saldo.
        preencherCampos(conta, dto);
        return ContaCorrenteResponseDto.from(repository.save(conta));
    }

    @Transactional
    public void deletar(Long id) {
        ContaCorrente conta = findOwned(id);
        Long empresaId = tenantCtx.getEmpresaId();
        // S.3: bloqueia exclusão quando há histórico/dependências vinculadas (§19)
        if (transferenciaRepository.existsByContaOrigemIdOrContaDestinoId(id, id)) {
            throw new BusinessException("CONTA_CORRENTE_EM_USO",
                    "Não é possível remover esta conta corrente: existem transferências vinculadas a ela.");
        }
        if (contaBaixadaRepository.existsByContaCorrenteId(id)) {
            throw new BusinessException("CONTA_CORRENTE_EM_USO",
                    "Não é possível remover esta conta corrente: existem pagamentos/recebimentos baixados nela.");
        }
        if (conciliacaoRepository.existsByContaCorrenteId(id)) {
            throw new BusinessException("CONTA_CORRENTE_EM_USO",
                    "Não é possível remover esta conta corrente: existem conciliações vinculadas a ela.");
        }
        if (cartaoCreditoRepository.existsByContaCorrenteIdAndEmpresaId(id, empresaId)) {
            throw new BusinessException("CONTA_CORRENTE_EM_USO",
                    "Não é possível remover esta conta corrente: existe um cartão de crédito vinculado a ela.");
        }
        repository.delete(conta);
    }

    @Requer("CONTA_CORRENTE_TRANSFERIR") // 3.1/S.6: defense-in-depth — vale também para a porta do chat IA
    @Transactional
    public TransferenciaResponseDto transferir(TransferenciaRequestDto dto) {
        Long empresaId = tenantCtx.getEmpresaId();

        if (dto.contaOrigemId().equals(dto.contaDestinoId())) {
            throw new IllegalArgumentException("Conta origem e destino não podem ser iguais");
        }
        // S.6: valida o valor no service (o @Valid do DTO só protege a porta HTTP, não o chat)
        if (dto.valor() == null || dto.valor().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("O valor da transferência deve ser maior que zero.");
        }

        ContaCorrente origem = repository.findByIdAndEmpresaId(dto.contaOrigemId(), empresaId)
                .orElseThrow(() -> new EntityNotFoundException("Conta origem não encontrada"));
        ContaCorrente destino = repository.findByIdAndEmpresaId(dto.contaDestinoId(), empresaId)
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
                .findAllByEmpresaIdOrderByDataTransferenciaDesc(tenantCtx.getEmpresaId())
                .stream().map(TransferenciaResponseDto::from).toList();
    }

    @Requer("CONTA_CORRENTE_TRANSFERIR")
    @Transactional
    public TransferenciaResponseDto atualizarTransferencia(Long id, TransferenciaRequestDto dto) {
        Long empresaId = tenantCtx.getEmpresaId();
        Transferencia transferencia = transferenciaRepository.findByIdAndEmpresaId(id, empresaId)
                .orElseThrow(() -> new EntityNotFoundException("Transferência não encontrada: " + id));

        if (dto.contaOrigemId().equals(dto.contaDestinoId())) {
            throw new IllegalArgumentException("Conta origem e destino não podem ser iguais");
        }
        if (dto.valor() == null || dto.valor().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("O valor da transferência deve ser maior que zero.");
        }

        // Estornar transferência antiga
        ContaCorrente origemAntiga = transferencia.getContaOrigem();
        ContaCorrente destinoAntigo = transferencia.getContaDestino();
        origemAntiga.setSaldo(origemAntiga.getSaldo().add(transferencia.getValor()));
        destinoAntigo.setSaldo(destinoAntigo.getSaldo().subtract(transferencia.getValor()));
        repository.save(origemAntiga);
        repository.save(destinoAntigo);

        // Aplicar nova transferência
        ContaCorrente novaOrigem = repository.findByIdAndEmpresaId(dto.contaOrigemId(), empresaId)
                .orElseThrow(() -> new EntityNotFoundException("Conta origem não encontrada"));
        ContaCorrente novoDestino = repository.findByIdAndEmpresaId(dto.contaDestinoId(), empresaId)
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
        Transferencia transferencia = transferenciaRepository.findByIdAndEmpresaId(id, tenantCtx.getEmpresaId())
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
        return repository.findByIdAndEmpresaId(id, tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Conta corrente não encontrada: " + id));
    }

    private void validarSaldo(ContaCorrenteRequestDto dto) {
        if (dto.saldo().compareTo(BigDecimal.ZERO) < 0 && !Boolean.TRUE.equals(dto.permitirSaldoNegativo())) {
            throw new IllegalArgumentException("Saldo inicial negativo requer que 'Permitir saldo negativo' esteja ativo");
        }
    }

    // S.2: NÃO define saldo aqui — é campo calculado. O saldo inicial é setado apenas em criar().
    private void preencherCampos(ContaCorrente c, ContaCorrenteRequestDto dto) {
        c.setNumeroConta(dto.numeroConta());
        c.setAgencia(dto.agencia());
        c.setDescricao(dto.descricao());
        c.setDataSaldoInicial(dto.dataSaldoInicial());
        c.setPermitirSaldoNegativo(Boolean.TRUE.equals(dto.permitirSaldoNegativo()));
    }
}
