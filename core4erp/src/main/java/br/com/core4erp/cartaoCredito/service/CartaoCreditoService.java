package br.com.core4erp.cartaoCredito.service;

import br.com.core4erp.assinatura.entity.Assinatura;
import br.com.core4erp.assinatura.repository.AssinaturaRepository;
import br.com.core4erp.cartaoCredito.dto.*;
import br.com.core4erp.cartaoCredito.entity.CartaoCredito;
import br.com.core4erp.cartaoCredito.entity.FaturaCartao;
import br.com.core4erp.cartaoCredito.entity.LancamentoCartao;
import br.com.core4erp.cartaoCredito.repository.CartaoCreditoRepository;
import br.com.core4erp.cartaoCredito.repository.FaturaCartaoRepository;
import br.com.core4erp.cartaoCredito.repository.LancamentoCartaoRepository;
import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.conta.dto.ContaCreateDto;
import br.com.core4erp.conta.dto.ContaResponseDto;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.service.ContaService;
import br.com.core4erp.contaCorrente.service.ContaCorrenteService;
import br.com.core4erp.parceiro.entity.Parceiro;
import br.com.core4erp.parceiro.repository.ParceiroRepository;
import br.com.core4erp.enums.StatusFatura;
import br.com.core4erp.enums.TipoConta;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import br.com.core4erp.utils.ParcelamentoHelper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class CartaoCreditoService {

    private final CartaoCreditoRepository cartaoRepo;
    private final LancamentoCartaoRepository lancamentoRepo;
    private final FaturaCartaoRepository faturaRepo;
    private final CategoriaRepository categoriaRepo;
    private final AssinaturaRepository assinaturaRepo;
    private final UsuarioRepository usuarioRepo;
    private final ParceiroRepository parceiroRepo;
    private final ContaCorrenteService contaCorrenteService;
    private final ContaService contaService;
    private final SecurityContextUtils securityCtx;
    private final TenantContext tenantCtx;

    public CartaoCreditoService(CartaoCreditoRepository cartaoRepo,
                                LancamentoCartaoRepository lancamentoRepo,
                                FaturaCartaoRepository faturaRepo,
                                CategoriaRepository categoriaRepo,
                                AssinaturaRepository assinaturaRepo,
                                UsuarioRepository usuarioRepo,
                                ParceiroRepository parceiroRepo,
                                ContaCorrenteService contaCorrenteService,
                                ContaService contaService,
                                SecurityContextUtils securityCtx,
                                TenantContext tenantCtx) {
        this.cartaoRepo = cartaoRepo;
        this.lancamentoRepo = lancamentoRepo;
        this.faturaRepo = faturaRepo;
        this.categoriaRepo = categoriaRepo;
        this.assinaturaRepo = assinaturaRepo;
        this.usuarioRepo = usuarioRepo;
        this.parceiroRepo = parceiroRepo;
        this.contaCorrenteService = contaCorrenteService;
        this.contaService = contaService;
        this.securityCtx = securityCtx;
        this.tenantCtx = tenantCtx;
    }

    // ── Cartões ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Page<CartaoCreditoResponseDto> listar(Pageable pageable) {
        Long eid = tenantCtx.getEmpresaId();
        Page<CartaoCredito> page = cartaoRepo.findAllByEmpresaId(eid, pageable);
        if (page.isEmpty()) return page.map(c -> CartaoCreditoResponseDto.from(c, BigDecimal.ZERO));

        YearMonth fim = YearMonth.now();
        YearMonth inicio = fim.minusMonths(5);
        List<Long> ids = page.getContent().stream().map(CartaoCredito::getId).toList();
        Map<Long, BigDecimal> limitesUsados = new HashMap<>();
        lancamentoRepo.sumValorByCartaoIdsAndPeriod(
                ids, eid,
                inicio.getMonthValue(), inicio.getYear(),
                fim.getMonthValue(), fim.getYear()
        ).forEach(row -> {
            Long cartaoId = ((Number) row[0]).longValue();
            BigDecimal soma = row[1] instanceof BigDecimal bd ? bd : new BigDecimal(row[1].toString());
            limitesUsados.put(cartaoId, soma);
        });

        return page.map(c -> CartaoCreditoResponseDto.from(c,
                limitesUsados.getOrDefault(c.getId(), BigDecimal.ZERO)));
    }

    @Transactional(readOnly = true)
    public CartaoCreditoResponseDto buscarPorId(Long id) {
        CartaoCredito c = findOwnedCartao(id);
        return CartaoCreditoResponseDto.from(c, calcularLimiteUsado(c));
    }

    @Transactional
    public CartaoCreditoResponseDto criar(CartaoCreditoRequestDto dto) {
        CartaoCredito cartao = new CartaoCredito();
        preencherCartao(cartao, dto);
        cartao.setUsuario(securityCtx.getUsuario());
        cartao = cartaoRepo.save(cartao);
        return CartaoCreditoResponseDto.from(cartao, BigDecimal.ZERO);
    }

    @Transactional
    public CartaoCreditoResponseDto atualizar(Long id, CartaoCreditoRequestDto dto) {
        CartaoCredito cartao = findOwnedCartao(id);
        preencherCartao(cartao, dto);
        cartao = cartaoRepo.save(cartao);
        return CartaoCreditoResponseDto.from(cartao, calcularLimiteUsado(cartao));
    }

    @Transactional
    public void deletar(Long id) {
        CartaoCredito cartao = findOwnedCartao(id);
        if (lancamentoRepo.existsByCartaoCreditoId(id)) {
            throw new IllegalStateException("Não é possível excluir cartão com lançamentos associados");
        }
        cartaoRepo.delete(cartao);
    }

    // ── Lançamentos ───────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<LancamentoResponseDto> listarLancamentos(Long cartaoId, Integer mes, Integer ano) {
        Long eid = tenantCtx.getEmpresaId();
        findOwnedCartao(cartaoId);
        List<LancamentoCartao> lista = (mes != null && ano != null)
                ? lancamentoRepo.findAllByCartaoCreditoIdAndEmpresaIdAndMesFaturaAndAnoFatura(cartaoId, eid, mes, ano)
                : lancamentoRepo.findAllByCartaoCreditoIdAndEmpresaId(cartaoId, eid);

        Set<String> fechadas = faturaRepo.findAllByCartaoCreditoIdAndEmpresaId(cartaoId, eid).stream()
                .filter(f -> f.getStatus() == StatusFatura.FECHADA)
                .map(f -> f.getMes() + ":" + f.getAno())
                .collect(Collectors.toSet());

        return lista.stream()
                .map(l -> LancamentoResponseDto.from(l, fechadas.contains(l.getMesFatura() + ":" + l.getAnoFatura())))
                .toList();
    }

    /**
     * Cria um ou mais lançamentos no cartão. Se {@code quantidadeParcelas > 1}, distribui o valor
     * pelas faturas subsequentes e agrupa sob o mesmo {@code grupoParcelamento}.
     */
    @Transactional
    public List<LancamentoResponseDto> criarLancamento(Long cartaoId, LancamentoRequestDto dto) {
        CartaoCredito cartao = findOwnedCartao(cartaoId);
        Long eid = tenantCtx.getEmpresaId();

        Categoria categoria = categoriaRepo.findByIdAndEmpresaId(dto.categoriaId(), eid)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada"));
        Parceiro parceiro = parceiroRepo.findByIdAndEmpresaId(dto.parceiroId(), eid)
                .orElseThrow(() -> new EntityNotFoundException("Parceiro não encontrado"));

        int parcelas = ParcelamentoHelper.normalizarParcelas(dto.quantidadeParcelas());
        boolean dividir = Boolean.TRUE.equals(dto.dividirValor());
        BigDecimal valorParcela = ParcelamentoHelper.calcularValorPorParcela(dto.valor(), parcelas, dividir);

        String grupo = ParcelamentoHelper.gerarGrupoParcelamento(parcelas);
        Usuario usuario = securityCtx.getUsuario();
        List<LancamentoCartao> criados = new ArrayList<>();
        YearMonth faturaBase = calcularFatura(dto.dataCompra(), cartao.getDiaFechamento());

        for (int i = 0; i < parcelas; i++) {
            YearMonth ym = faturaBase.plusMonths(i);
            LancamentoCartao l = new LancamentoCartao();
            l.setDescricao(dto.descricao());
            l.setValor(valorParcela);
            l.setDataCompra(dto.dataCompra());
            l.setMesFatura(ym.getMonthValue());
            l.setAnoFatura(ym.getYear());
            l.setGrupoParcelamento(grupo);
            l.setNumeroParcela(i + 1);
            l.setTotalParcelas(parcelas);
            l.setCartaoCredito(cartao);
            l.setCategoria(categoria);
            l.setParceiro(parceiro);
            l.setUsuario(usuario);
            criados.add(l);
        }

        return lancamentoRepo.saveAll(criados).stream().map(l -> LancamentoResponseDto.from(l, false)).toList();
    }

    @Transactional
    public LancamentoResponseDto atualizarLancamento(Long cartaoId, Long lancamentoId, LancamentoRequestDto dto) {
        CartaoCredito cartao = findOwnedCartao(cartaoId);
        LancamentoCartao l = findOwnedLancamento(cartaoId, lancamentoId);
        verificarFaturaAberta(cartaoId, l.getMesFatura(), l.getAnoFatura());
        YearMonth novaFatura = calcularFatura(dto.dataCompra(), cartao.getDiaFechamento());
        if (novaFatura.getMonthValue() != l.getMesFatura() || novaFatura.getYear() != l.getAnoFatura()) {
            verificarFaturaAberta(cartaoId, novaFatura.getMonthValue(), novaFatura.getYear());
        }
        Long eid = tenantCtx.getEmpresaId();
        Categoria cat = categoriaRepo.findByIdAndEmpresaId(dto.categoriaId(), eid)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada"));
        Parceiro par = parceiroRepo.findByIdAndEmpresaId(dto.parceiroId(), eid)
                .orElseThrow(() -> new EntityNotFoundException("Parceiro não encontrado"));
        l.setDescricao(dto.descricao());
        l.setValor(dto.valor());
        l.setDataCompra(dto.dataCompra());
        l.setMesFatura(novaFatura.getMonthValue());
        l.setAnoFatura(novaFatura.getYear());
        l.setCategoria(cat);
        l.setParceiro(par);
        return LancamentoResponseDto.from(lancamentoRepo.save(l), false);
    }

    @Transactional
    public void deletarLancamento(Long cartaoId, Long lancamentoId) {
        LancamentoCartao l = findOwnedLancamento(cartaoId, lancamentoId);
        verificarFaturaAberta(cartaoId, l.getMesFatura(), l.getAnoFatura());
        lancamentoRepo.delete(l);
    }

    // ── Fechamento de fatura ──────────────────────────────────────────────────

    @Transactional
    public ContaResponseDto fecharFatura(Long cartaoId, FechamentoFaturaRequestDto dto) {
        CartaoCredito cartao = findOwnedCartao(cartaoId);
        Long eid = tenantCtx.getEmpresaId();

        faturaRepo.findByCartaoCreditoIdAndMesAndAnoAndEmpresaId(cartaoId, dto.mes(), dto.ano(), eid)
                .filter(f -> f.getStatus() == StatusFatura.FECHADA)
                .ifPresent(f -> { throw new IllegalStateException("Fatura já fechada para este período"); });

        List<LancamentoCartao> lancamentos = lancamentoRepo
                .findAllByCartaoCreditoIdAndEmpresaIdAndMesFaturaAndAnoFatura(cartaoId, eid, dto.mes(), dto.ano());
        if (lancamentos.isEmpty()) {
            throw new IllegalStateException("Nenhum lançamento encontrado para esta fatura");
        }

        BigDecimal total = lancamentos.stream()
                .map(LancamentoCartao::getValor)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        YearMonth mesFatura = YearMonth.of(dto.ano(), dto.mes());
        LocalDate dataVencimento = mesFatura.plusMonths(1)
                .atDay(Math.min(cartao.getDiaVencimento(), mesFatura.plusMonths(1).lengthOfMonth()));

        String descricaoFatura = String.format("Fatura %s/%d — %s",
                String.format("%02d", dto.mes()), dto.ano(), cartao.getNome());

        Categoria categoriaDaFatura = lancamentos.get(0).getCategoria();

        ContaCreateDto contaDto = new ContaCreateDto(
                descricaoFatura, total, dataVencimento, TipoConta.PAGAR,
                categoriaDaFatura.getId(), null, 1, 1, false, null, null, null
        );

        List<ContaResponseDto> contas = contaService.criar(contaDto);
        Conta contaGerada = contaService.findOwnedEntity(contas.get(0).id());

        FaturaCartao fatura = faturaRepo
                .findByCartaoCreditoIdAndMesAndAnoAndEmpresaId(cartaoId, dto.mes(), dto.ano(), eid)
                .orElseGet(() -> {
                    FaturaCartao nova = new FaturaCartao();
                    nova.setCartaoCredito(cartao);
                    nova.setMes(dto.mes());
                    nova.setAno(dto.ano());
                    nova.setUsuario(securityCtx.getUsuario());
                    return nova;
                });
        fatura.setStatus(StatusFatura.FECHADA);
        fatura.setConta(contaGerada);
        faturaRepo.save(fatura);

        return contas.get(0);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private BigDecimal calcularLimiteUsado(CartaoCredito cartao) {
        YearMonth fim = YearMonth.now();
        YearMonth inicio = fim.minusMonths(5);
        return lancamentoRepo.sumValorByCartaoAndPeriod(
                cartao.getId(),
                inicio.getMonthValue(), inicio.getYear(),
                fim.getMonthValue(), fim.getYear());
    }

    private void preencherCartao(CartaoCredito c, CartaoCreditoRequestDto dto) {
        c.setNome(dto.nome());
        c.setLimite(dto.limite());
        c.setDiaFechamento(dto.diaFechamento());
        c.setDiaVencimento(dto.diaVencimento());
        c.setContaCorrente(contaCorrenteService.findOwned(dto.contaCorrenteId()));
    }

    /**
     * Gera lançamentos mensais para assinaturas vinculadas a cartão de crédito.
     * Idempotente: o índice único (assinatura_id, mes_fatura, ano_fatura) impede duplicatas.
     * Chamado pelo scheduler e pelo endpoint de sincronização.
     */
    @Transactional
    public void gerarLancamentosAssinaturas(Long empresaId) {
        LocalDate hoje = LocalDate.now();
        List<Assinatura> assinaturas = assinaturaRepo
                .findAllByEmpresaIdAndAtivaAndCartaoCreditoIsNotNull(empresaId, true);

        for (Assinatura assinatura : assinaturas) {
            CartaoCredito cartao = assinatura.getCartaoCredito();
            int diaCobranca = Math.min(assinatura.getDiaVencimento(), hoje.lengthOfMonth());
            LocalDate dataCobranca = hoje.withDayOfMonth(diaCobranca);
            YearMonth fatura = calcularFatura(dataCobranca, cartao.getDiaFechamento());

            if (lancamentoRepo.existsByAssinaturaIdAndMesFaturaAndAnoFatura(
                    assinatura.getId(), fatura.getMonthValue(), fatura.getYear())) continue;

            LancamentoCartao l = new LancamentoCartao();
            l.setDescricao(assinatura.getDescricao());
            l.setValor(assinatura.getValor());
            l.setDataCompra(dataCobranca);
            l.setMesFatura(fatura.getMonthValue());
            l.setAnoFatura(fatura.getYear());
            l.setNumeroParcela(1);
            l.setTotalParcelas(1);
            l.setCartaoCredito(cartao);
            l.setCategoria(assinatura.getCategoria());
            l.setParceiro(assinatura.getParceiro());
            l.setAssinatura(assinatura);
            l.setUsuario(assinatura.getUsuario());
            lancamentoRepo.save(l);
        }
    }

    /**
     * Retorna o YearMonth da fatura à qual a compra pertence.
     * Se o dia da compra >= diaFechamento, a compra cai na fatura do mês seguinte.
     */
    private YearMonth calcularFatura(LocalDate dataCompra, int diaFechamento) {
        YearMonth mesCompra = YearMonth.from(dataCompra);
        return dataCompra.getDayOfMonth() >= diaFechamento
                ? mesCompra.plusMonths(1)
                : mesCompra;
    }

    private void verificarFaturaAberta(Long cartaoId, Integer mes, Integer ano) {
        if (faturaRepo.existsByCartaoCreditoIdAndMesAndAnoAndEmpresaIdAndStatus(
                cartaoId, mes, ano, tenantCtx.getEmpresaId(), StatusFatura.FECHADA)) {
            throw new IllegalStateException("Fatura " + String.format("%02d", mes) + "/" + ano
                    + " está fechada. Estorne o pagamento ou reabra a fatura para editar lançamentos.");
        }
    }

    @Transactional(readOnly = true)
    public List<CartaoDashboardResumoDto> dashboardResumo() {
        Long eid = tenantCtx.getEmpresaId();
        YearMonth fim = YearMonth.now();
        YearMonth inicio = fim.minusMonths(2);
        return lancamentoRepo.resumoDashboardPorCategoria(
                eid,
                inicio.getMonthValue(), inicio.getYear(),
                fim.getMonthValue(), fim.getYear()
        ).stream().map(row -> new CartaoDashboardResumoDto(
                (String) row[0],
                ((Number) row[1]).intValue(),
                ((Number) row[2]).intValue(),
                row[3] instanceof BigDecimal bd ? bd : new BigDecimal(row[3].toString())
        )).toList();
    }

    private CartaoCredito findOwnedCartao(Long id) {
        return cartaoRepo.findByIdAndEmpresaId(id, tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Cartão não encontrado: " + id));
    }

    private LancamentoCartao findOwnedLancamento(Long cartaoId, Long lancamentoId) {
        return lancamentoRepo.findByIdAndCartaoCreditoIdAndEmpresaId(lancamentoId, cartaoId, tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Lançamento não encontrado: " + lancamentoId));
    }
}
