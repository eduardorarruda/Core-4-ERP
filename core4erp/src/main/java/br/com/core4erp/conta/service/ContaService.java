package br.com.core4erp.conta.service;

import br.com.core4erp.cartaoCredito.service.FaturaCartaoService;
import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.conta.dto.BaixaRequestDto;
import br.com.core4erp.conta.dto.ContaCreateDto;
import br.com.core4erp.conta.dto.ContaResponseDto;
import br.com.core4erp.conta.dto.GastoContaCorrenteDto;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.entity.ContaBaixada;
import br.com.core4erp.conta.repository.ContaBaixadaRepository;
import br.com.core4erp.conta.repository.ContaRepository;
import br.com.core4erp.conta.repository.ContaSpec;
import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import br.com.core4erp.contaCorrente.repository.ContaCorrenteRepository;
import br.com.core4erp.contaCorrente.service.ContaCorrenteService;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.TipoConta;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.parceiro.entity.Parceiro;
import br.com.core4erp.parceiro.repository.ParceiroRepository;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.core4erp.utils.DtoValidator;
import br.com.core4erp.utils.ParcelamentoHelper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
public class ContaService {

    private final ContaRepository contaRepository;
    private final ContaBaixadaRepository baixadaRepository;
    private final CategoriaRepository categoriaRepository;
    private final ParceiroRepository parceiroRepository;
    private final ContaCorrenteService contaCorrenteService;
    private final ContaCorrenteRepository contaCorrenteRepository;
    private final FaturaCartaoService faturaCartaoService;
    private final SecurityContextUtils securityCtx;
    private final TenantContext tenantCtx;
    private final DtoValidator dtoValidator;

    public ContaService(ContaRepository contaRepository,
                        ContaBaixadaRepository baixadaRepository,
                        CategoriaRepository categoriaRepository,
                        ParceiroRepository parceiroRepository,
                        ContaCorrenteService contaCorrenteService,
                        ContaCorrenteRepository contaCorrenteRepository,
                        FaturaCartaoService faturaCartaoService,
                        SecurityContextUtils securityCtx,
                        TenantContext tenantCtx,
                        DtoValidator dtoValidator) {
        this.contaRepository = contaRepository;
        this.baixadaRepository = baixadaRepository;
        this.categoriaRepository = categoriaRepository;
        this.parceiroRepository = parceiroRepository;
        this.contaCorrenteService = contaCorrenteService;
        this.contaCorrenteRepository = contaCorrenteRepository;
        this.faturaCartaoService = faturaCartaoService;
        this.securityCtx = securityCtx;
        this.tenantCtx = tenantCtx;
        this.dtoValidator = dtoValidator;
    }

    @Transactional(readOnly = true)
    public Page<ContaResponseDto> listar(Pageable pageable) {
        return contaRepository.findAllByEmpresaId(tenantCtx.getEmpresaId(), pageable)
                .map(ContaResponseDto::from);
    }

    @Transactional(readOnly = true)
    public Page<ContaResponseDto> listarPorTipo(TipoConta tipo, Pageable pageable) {
        return contaRepository.findAllByEmpresaIdAndTipo(tenantCtx.getEmpresaId(), tipo, pageable)
                .map(ContaResponseDto::from);
    }

    @Transactional(readOnly = true)
    public Page<ContaResponseDto> listarComFiltros(
            TipoConta tipo, StatusConta status, String numeroDocumento,
            LocalDate vencimentoInicio, LocalDate vencimentoFim,
            Long parceiroId, BigDecimal valorMin, BigDecimal valorMax,
            Long categoriaId, Pageable pageable) {

        Specification<Conta> spec = ContaSpec.empresaId(tenantCtx.getEmpresaId());
        if (tipo != null)               spec = spec.and(ContaSpec.tipo(tipo));
        if (status != null)             spec = spec.and(ContaSpec.status(status));
        if (numeroDocumento != null && !numeroDocumento.isBlank())
                                        spec = spec.and(ContaSpec.numeroDocumentoContains(numeroDocumento));
        if (vencimentoInicio != null)   spec = spec.and(ContaSpec.vencimentoApartirDe(vencimentoInicio));
        if (vencimentoFim != null)      spec = spec.and(ContaSpec.vencimentoAte(vencimentoFim));
        if (parceiroId != null)         spec = spec.and(ContaSpec.parceiroId(parceiroId));
        if (valorMin != null)           spec = spec.and(ContaSpec.valorMinimo(valorMin));
        if (valorMax != null)           spec = spec.and(ContaSpec.valorMaximo(valorMax));
        if (categoriaId != null)        spec = spec.and(ContaSpec.categoriaId(categoriaId));

        return contaRepository.findAll(spec, pageable).map(ContaResponseDto::from);
    }

    @Transactional(readOnly = true)
    public ContaResponseDto buscarPorId(Long id) {
        return ContaResponseDto.from(findOwned(id));
    }

    /** Total pago por conta corrente (saídas), do maior para o menor — para a IA. */
    @Transactional(readOnly = true)
    public List<GastoContaCorrenteDto> gastoPorContaCorrente() {
        return baixadaRepository.gastoPorContaCorrente(tenantCtx.getEmpresaId()).stream()
                .map(r -> new GastoContaCorrenteDto(
                        (String) r[0],
                        r[1] instanceof BigDecimal bd ? bd : new BigDecimal(r[1].toString())))
                .toList();
    }

    /**
     * Cria uma conta financeira com suporte a parcelamento: se {@code quantidadeParcelas > 1},
     * gera N registros com vencimentos espaçados por {@code intervaloMeses}. Quando
     * {@code dividirValor=true}, o valor total é dividido igualmente entre as parcelas.
     */
    @Transactional
    public List<ContaResponseDto> criar(ContaCreateDto dto) {
        dtoValidator.validar(dto);
        Usuario usuario = securityCtx.getUsuario();
        Long empresaId = tenantCtx.getEmpresaId();

        Categoria categoria = categoriaRepository.findByIdAndEmpresaId(dto.categoriaId(), empresaId)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada"));

        Parceiro parceiro = null;
        if (dto.parceiroId() != null) {
            parceiro = parceiroRepository.findByIdAndEmpresaId(dto.parceiroId(), empresaId)
                    .orElseThrow(() -> new EntityNotFoundException("Parceiro não encontrado"));
        }

        int parcelas = ParcelamentoHelper.normalizarParcelas(dto.quantidadeParcelas());
        int intervalo = ParcelamentoHelper.normalizarIntervalo(dto.intervaloMeses());
        boolean dividir = Boolean.TRUE.equals(dto.dividirValor());

        BigDecimal valorPorParcela = ParcelamentoHelper.calcularValorPorParcela(dto.valorOriginal(), parcelas, dividir);

        BigDecimal ac = dto.acrescimo() != null ? dto.acrescimo() : BigDecimal.ZERO;
        BigDecimal desc = dto.desconto() != null ? dto.desconto() : BigDecimal.ZERO;
        BigDecimal valorLiquido = valorPorParcela.add(ac).subtract(desc).setScale(2, RoundingMode.HALF_UP);

        String grupo = ParcelamentoHelper.gerarGrupoParcelamento(parcelas);
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
            criadas.add(conta);
        }

        return contaRepository.saveAll(criadas).stream().map(ContaResponseDto::from).toList();
    }

    @Transactional
    public ContaResponseDto atualizar(Long id, ContaCreateDto dto) {
        dtoValidator.validar(dto);
        Conta conta = findOwned(id);

        // S.1: conta já baixada é imutável (§16). Editar valor/vencimento de uma conta paga
        // dessincronizaria o saldo da conta corrente. Para ajustar, estorne antes.
        if (conta.getStatus() == StatusConta.PAGO || conta.getStatus() == StatusConta.RECEBIDO) {
            throw new BusinessException("CONTA_BAIXADA",
                    "Não é possível editar uma conta já baixada. Estorne a baixa antes de alterar os dados.");
        }

        if (Boolean.TRUE.equals(conta.getConciliada())) {
            throw new BusinessException("CONTA_CONCILIADA",
                    "Não é possível editar uma conta conciliada via extrato bancário");
        }

        Long empresaId = tenantCtx.getEmpresaId();
        Categoria categoria = categoriaRepository.findByIdAndEmpresaId(dto.categoriaId(), empresaId)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada"));
        Parceiro parceiro = null;
        if (dto.parceiroId() != null) {
            parceiro = parceiroRepository.findByIdAndEmpresaId(dto.parceiroId(), empresaId)
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
        faturaCartaoService.reabrirEDesvincular(id);
        contaRepository.delete(conta);
    }

    /**
     * Registra o pagamento/recebimento de uma conta: cria um registro {@link br.com.core4erp.conta.entity.ContaBaixada},
     * aplica juros/multa/acréscimo/desconto ao valor original e ajusta o saldo da conta corrente informada.
     */
    @Transactional(noRollbackFor = {BusinessException.class, IllegalStateException.class, jakarta.persistence.EntityNotFoundException.class})
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
                .add(juros).add(multa).add(acrescimo).subtract(desconto)
                .setScale(2, RoundingMode.HALF_UP);

        // Verificar saldo antes de qualquer escrita para não marcar a transação como rollback-only
        BigDecimal delta = conta.getTipo() == TipoConta.PAGAR ? valorFinal.negate() : valorFinal;
        if (conta.getTipo() == TipoConta.PAGAR
                && contaCorrente.getSaldo().compareTo(valorFinal) < 0
                && !Boolean.TRUE.equals(contaCorrente.getPermitirSaldoNegativo())) {
            throw new BusinessException("SALDO_INSUFICIENTE",
                    "Operação bloqueada: saldo insuficiente e a conta não permite saldo negativo");
        }

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

        contaCorrente.setSaldo(contaCorrente.getSaldo().add(delta));
        contaCorrenteRepository.save(contaCorrente);

        conta.setStatus(conta.getTipo() == TipoConta.PAGAR ? StatusConta.PAGO : StatusConta.RECEBIDO);
        return ContaResponseDto.from(contaRepository.save(conta));
    }

    /**
     * Estorna a baixa de uma conta: reverte o saldo na conta corrente, remove o {@code ContaBaixada}
     * e, se a conta era originada do fechamento de uma fatura de cartão, reabre a fatura.
     */
    @Transactional
    public ContaResponseDto estornar(Long id) {
        Conta conta = findOwned(id);

        if (conta.getStatus() != StatusConta.PAGO && conta.getStatus() != StatusConta.RECEBIDO) {
            throw new IllegalStateException("Conta não está baixada");
        }
        if (Boolean.TRUE.equals(conta.getConciliada())) {
            throw new IllegalStateException("Não é possível estornar uma conta conciliada via extrato bancário");
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

        faturaCartaoService.reabrir(id);

        return result;
    }

    public Conta findOwnedEntity(Long id) {
        return findOwned(id);
    }

    private Conta findOwned(Long id) {
        return contaRepository.findByIdAndEmpresaId(id, tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Conta não encontrada: " + id));
    }

    private BigDecimal nullSafe(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }
}
