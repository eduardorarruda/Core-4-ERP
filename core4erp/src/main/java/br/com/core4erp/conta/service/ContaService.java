package br.com.core4erp.conta.service;

import br.com.core4erp.cartaoCredito.entity.FaturaCartao;
import br.com.core4erp.cartaoCredito.repository.FaturaCartaoRepository;
import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.conta.dto.BaixaRequestDto;
import br.com.core4erp.conta.dto.ContaCreateDto;
import br.com.core4erp.conta.dto.ContaResponseDto;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.entity.ContaBaixada;
import br.com.core4erp.conta.repository.ContaBaixadaRepository;
import br.com.core4erp.conta.repository.ContaRepository;
import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import br.com.core4erp.contaCorrente.repository.ContaCorrenteRepository;
import br.com.core4erp.contaCorrente.service.ContaCorrenteService;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.StatusFatura;
import br.com.core4erp.enums.TipoConta;
import br.com.core4erp.parceiro.entity.Parceiro;
import br.com.core4erp.parceiro.repository.ParceiroRepository;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ContaService {

    private final ContaRepository contaRepository;
    private final ContaBaixadaRepository baixadaRepository;
    private final CategoriaRepository categoriaRepository;
    private final ParceiroRepository parceiroRepository;
    private final ContaCorrenteService contaCorrenteService;
    private final ContaCorrenteRepository contaCorrenteRepository;
    private final FaturaCartaoRepository faturaCartaoRepository;
    private final SecurityContextUtils securityCtx;

    public ContaService(ContaRepository contaRepository,
                        ContaBaixadaRepository baixadaRepository,
                        CategoriaRepository categoriaRepository,
                        ParceiroRepository parceiroRepository,
                        ContaCorrenteService contaCorrenteService,
                        ContaCorrenteRepository contaCorrenteRepository,
                        FaturaCartaoRepository faturaCartaoRepository,
                        SecurityContextUtils securityCtx) {
        this.contaRepository = contaRepository;
        this.baixadaRepository = baixadaRepository;
        this.categoriaRepository = categoriaRepository;
        this.parceiroRepository = parceiroRepository;
        this.contaCorrenteService = contaCorrenteService;
        this.contaCorrenteRepository = contaCorrenteRepository;
        this.faturaCartaoRepository = faturaCartaoRepository;
        this.securityCtx = securityCtx;
    }

    @Transactional(readOnly = true)
    public Page<ContaResponseDto> listar(Pageable pageable) {
        return contaRepository.findAllByUsuarioId(securityCtx.getUsuarioId(), pageable)
                .map(ContaResponseDto::from);
    }

    @Transactional(readOnly = true)
    public Page<ContaResponseDto> listarPorTipo(TipoConta tipo, Pageable pageable) {
        return contaRepository.findAllByUsuarioIdAndTipo(securityCtx.getUsuarioId(), tipo, pageable)
                .map(ContaResponseDto::from);
    }

    @Transactional(readOnly = true)
    public ContaResponseDto buscarPorId(Long id) {
        return ContaResponseDto.from(findOwned(id));
    }

    @Transactional
    public List<ContaResponseDto> criar(ContaCreateDto dto) {
        Usuario usuario = securityCtx.getUsuario();
        Long usuarioId = usuario.getId();

        Categoria categoria = categoriaRepository.findByIdAndUsuarioId(dto.categoriaId(), usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada"));

        Parceiro parceiro = null;
        if (dto.parceiroId() != null) {
            parceiro = parceiroRepository.findByIdAndUsuarioId(dto.parceiroId(), usuarioId)
                    .orElseThrow(() -> new EntityNotFoundException("Parceiro não encontrado"));
        }

        int parcelas = (dto.quantidadeParcelas() == null || dto.quantidadeParcelas() < 1) ? 1 : dto.quantidadeParcelas();
        int intervalo = (dto.intervaloMeses() == null || dto.intervaloMeses() < 1) ? 1 : dto.intervaloMeses();
        boolean dividir = Boolean.TRUE.equals(dto.dividirValor());

        BigDecimal valorPorParcela = dividir && parcelas > 1
                ? dto.valorOriginal().divide(BigDecimal.valueOf(parcelas), 2, RoundingMode.HALF_UP)
                : dto.valorOriginal();

        BigDecimal ac = dto.acrescimo() != null ? dto.acrescimo() : BigDecimal.ZERO;
        BigDecimal desc = dto.desconto() != null ? dto.desconto() : BigDecimal.ZERO;
        BigDecimal valorLiquido = valorPorParcela.add(ac).subtract(desc);

        String grupo = parcelas > 1 ? UUID.randomUUID().toString() : null;
        List<Conta> criadas = new ArrayList<>();

        for (int i = 0; i < parcelas; i++) {
            Conta conta = new Conta();
            conta.setDescricao(dto.descricao());
            conta.setNumeroDocumento(dto.numeroDocumento());
            conta.setValorOriginal(valorLiquido);
            conta.setAcrescimo(ac);
            conta.setDesconto(desc);
            conta.setDataVencimento(dto.dataVencimento().plusMonths((long) i * intervalo));
            conta.setTipo(dto.tipo());
            conta.setStatus(StatusConta.PENDENTE);
            conta.setGrupoParcelamento(grupo);
            conta.setNumeroParcela(i + 1);
            conta.setTotalParcelas(parcelas);
            conta.setCategoria(categoria);
            conta.setParceiro(parceiro);
            conta.setUsuario(usuario);
            criadas.add(contaRepository.save(conta));
        }

        return criadas.stream().map(ContaResponseDto::from).toList();
    }

    @Transactional
    public ContaResponseDto atualizar(Long id, ContaCreateDto dto) {
        Conta conta = findOwned(id);

        if (conta.getStatus() != StatusConta.PENDENTE && conta.getStatus() != StatusConta.ATRASADO) {
            throw new IllegalStateException("Só é possível editar contas com status PENDENTE ou ATRASADO");
        }

        Long usuarioId = securityCtx.getUsuarioId();
        Categoria categoria = categoriaRepository.findByIdAndUsuarioId(dto.categoriaId(), usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada"));
        Parceiro parceiro = null;
        if (dto.parceiroId() != null) {
            parceiro = parceiroRepository.findByIdAndUsuarioId(dto.parceiroId(), usuarioId)
                    .orElseThrow(() -> new EntityNotFoundException("Parceiro não encontrado"));
        }

        conta.setDescricao(dto.descricao());
        conta.setValorOriginal(dto.valorOriginal());
        conta.setDataVencimento(dto.dataVencimento());
        conta.setTipo(dto.tipo());
        conta.setCategoria(categoria);
        conta.setParceiro(parceiro);
        return ContaResponseDto.from(contaRepository.save(conta));
    }

    @Transactional
    public void deletar(Long id) {
        Conta conta = findOwned(id);
        if (baixadaRepository.existsByContaId(id)) {
            throw new IllegalStateException("Não é possível excluir uma conta já baixada");
        }
        // RN2: se esta conta foi gerada pelo fechamento de uma fatura, reabrir a fatura
        faturaCartaoRepository.findByContaId(id).ifPresent(fatura -> {
            fatura.setStatus(StatusFatura.ABERTA);
            fatura.setConta(null);
            faturaCartaoRepository.save(fatura);
        });
        contaRepository.delete(conta);
    }

    @Transactional
    public ContaResponseDto baixar(Long id, BaixaRequestDto dto) {
        Conta conta = findOwned(id);

        if (conta.getStatus() == StatusConta.PAGO || conta.getStatus() == StatusConta.RECEBIDO) {
            throw new IllegalStateException("Conta já foi baixada");
        }
        if (baixadaRepository.existsByContaId(id)) {
            throw new IllegalStateException("Conta já foi baixada");
        }

        ContaCorrente contaCorrente = contaCorrenteService.findOwned(dto.contaCorrenteId());

        BigDecimal juros = nullSafe(dto.juros());
        BigDecimal multa = nullSafe(dto.multa());
        BigDecimal acrescimo = nullSafe(dto.acrescimo());
        BigDecimal desconto = nullSafe(dto.desconto());
        BigDecimal valorFinal = conta.getValorOriginal()
                .add(juros).add(multa).add(acrescimo).subtract(desconto);

        ContaBaixada baixada = new ContaBaixada();
        baixada.setConta(conta);
        baixada.setContaCorrente(contaCorrente);
        baixada.setDataPagamento(dto.dataPagamento());
        baixada.setJuros(juros);
        baixada.setMulta(multa);
        baixada.setAcrescimo(acrescimo);
        baixada.setDesconto(desconto);
        baixada.setValorFinal(valorFinal);
        baixada.setUsuario(securityCtx.getUsuario());
        baixadaRepository.save(baixada);

        // Atualiza saldo da conta corrente
        BigDecimal delta = conta.getTipo() == TipoConta.PAGAR ? valorFinal.negate() : valorFinal;
        contaCorrente.setSaldo(contaCorrente.getSaldo().add(delta));
        contaCorrenteRepository.save(contaCorrente);

        conta.setStatus(conta.getTipo() == TipoConta.PAGAR ? StatusConta.PAGO : StatusConta.RECEBIDO);
        return ContaResponseDto.from(contaRepository.save(conta));
    }

    @Transactional
    public ContaResponseDto estornar(Long id) {
        Conta conta = findOwned(id);

        if (conta.getStatus() != StatusConta.PAGO && conta.getStatus() != StatusConta.RECEBIDO) {
            throw new IllegalStateException("Conta não está baixada");
        }

        ContaBaixada baixada = baixadaRepository.findByContaId(id)
                .orElseThrow(() -> new EntityNotFoundException("Baixa não encontrada para a conta " + id));

        // Reverte saldo da conta corrente
        BigDecimal delta = conta.getTipo() == TipoConta.PAGAR
                ? baixada.getValorFinal()
                : baixada.getValorFinal().negate();
        ContaCorrente cc = baixada.getContaCorrente();
        cc.setSaldo(cc.getSaldo().add(delta));
        contaCorrenteRepository.save(cc);

        baixadaRepository.delete(baixada);

        conta.setStatus(StatusConta.PENDENTE);
        ContaResponseDto result = ContaResponseDto.from(contaRepository.save(conta));

        // RN2: se esta conta era de uma fatura, reabrir a fatura
        faturaCartaoRepository.findByContaId(id).ifPresent(fatura -> {
            fatura.setStatus(StatusFatura.ABERTA);
            faturaCartaoRepository.save(fatura);
        });

        return result;
    }

    public Conta findOwnedEntity(Long id) {
        return findOwned(id);
    }

    private Conta findOwned(Long id) {
        return contaRepository.findByIdAndUsuarioId(id, securityCtx.getUsuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Conta não encontrada: " + id));
    }

    private BigDecimal nullSafe(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
