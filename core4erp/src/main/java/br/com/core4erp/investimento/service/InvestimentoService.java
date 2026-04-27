package br.com.core4erp.investimento.service;

import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import br.com.core4erp.contaCorrente.service.ContaCorrenteService;
import br.com.core4erp.enums.TipoTransacaoInvestimento;
import br.com.core4erp.investimento.dto.*;
import br.com.core4erp.investimento.entity.ContaInvestimento;
import br.com.core4erp.investimento.entity.TransacaoInvestimento;
import br.com.core4erp.investimento.repository.ContaInvestimentoRepository;
import br.com.core4erp.investimento.repository.TransacaoInvestimentoRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class InvestimentoService {

    private final ContaInvestimentoRepository contaRepo;
    private final TransacaoInvestimentoRepository transacaoRepo;
    private final ContaCorrenteService contaCorrenteService;
    private final SecurityContextUtils securityCtx;

    public InvestimentoService(ContaInvestimentoRepository contaRepo,
                               TransacaoInvestimentoRepository transacaoRepo,
                               ContaCorrenteService contaCorrenteService,
                               SecurityContextUtils securityCtx) {
        this.contaRepo = contaRepo;
        this.transacaoRepo = transacaoRepo;
        this.contaCorrenteService = contaCorrenteService;
        this.securityCtx = securityCtx;
    }

    // ── Contas de Investimento ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<ContaInvestimentoResponseDto> listar() {
        return contaRepo.findAllByUsuarioId(securityCtx.getUsuarioId())
                .stream().map(ContaInvestimentoResponseDto::from).toList();
    }

    @Transactional(readOnly = true)
    public ContaInvestimentoResponseDto buscarPorId(Long id) {
        return ContaInvestimentoResponseDto.from(findOwnedConta(id));
    }

    @Transactional
    public ContaInvestimentoResponseDto criar(ContaInvestimentoRequestDto dto) {
        ContaInvestimento c = new ContaInvestimento();
        c.setNome(dto.nome());
        c.setTipo(dto.tipo());
        c.setSaldoAtual(BigDecimal.ZERO);
        c.setUsuario(securityCtx.getUsuario());
        return ContaInvestimentoResponseDto.from(contaRepo.save(c));
    }

    @Transactional
    public ContaInvestimentoResponseDto atualizar(Long id, ContaInvestimentoRequestDto dto) {
        ContaInvestimento c = findOwnedConta(id);
        c.setNome(dto.nome());
        c.setTipo(dto.tipo());
        return ContaInvestimentoResponseDto.from(contaRepo.save(c));
    }

    @Transactional
    public void deletar(Long id) {
        ContaInvestimento c = findOwnedConta(id);
        if (transacaoRepo.existsByContaInvestimentoId(id)) {
            throw new IllegalStateException("Não é possível excluir conta com transações associadas");
        }
        contaRepo.delete(c);
    }

    // ── Transações ────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TransacaoInvestimentoResponseDto> listarTransacoes(Long contaId) {
        findOwnedConta(contaId);
        return transacaoRepo.findAllByContaInvestimentoIdAndUsuarioId(contaId, securityCtx.getUsuarioId())
                .stream().map(TransacaoInvestimentoResponseDto::from).toList();
    }

    @Transactional
    public TransacaoInvestimentoResponseDto registrarTransacao(Long contaId, TransacaoInvestimentoRequestDto dto) {
        ContaInvestimento conta = findOwnedConta(contaId);
        TipoTransacaoInvestimento tipo = dto.tipoTransacao();

        if ((tipo == TipoTransacaoInvestimento.APORTE || tipo == TipoTransacaoInvestimento.RESGATE)
                && (dto.valor() == null || dto.valor().compareTo(BigDecimal.ZERO) <= 0)) {
            throw new IllegalArgumentException("Valor deve ser positivo para APORTE e RESGATE");
        }

        TransacaoInvestimento t = new TransacaoInvestimento();
        t.setContaInvestimento(conta);
        t.setTipoTransacao(tipo);
        t.setValor(dto.valor());
        t.setDataTransacao(dto.dataTransacao());
        t.setUsuario(securityCtx.getUsuario());

        switch (tipo) {
            case APORTE -> {
                conta.setSaldoAtual(conta.getSaldoAtual().add(dto.valor()));
                if (dto.contaCorrenteOrigemId() != null) {
                    ContaCorrente cc = contaCorrenteService.findOwned(dto.contaCorrenteOrigemId());
                    if (cc.getSaldo().compareTo(dto.valor()) < 0)
                        throw new IllegalStateException("Saldo insuficiente na conta corrente");
                    cc.setSaldo(cc.getSaldo().subtract(dto.valor()));
                    t.setContaCorrenteOrigem(cc);
                }
            }
            case RESGATE -> conta.setSaldoAtual(conta.getSaldoAtual().subtract(dto.valor()));
            case RENDIMENTO -> conta.setSaldoAtual(conta.getSaldoAtual().add(dto.valor()));
            default -> throw new IllegalArgumentException("Tipo de transação desconhecido: " + tipo);
        }

        contaRepo.save(conta);
        return TransacaoInvestimentoResponseDto.from(transacaoRepo.save(t));
    }

    private ContaInvestimento findOwnedConta(Long id) {
        return contaRepo.findByIdAndUsuarioId(id, securityCtx.getUsuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Conta de investimento não encontrada: " + id));
    }
}
