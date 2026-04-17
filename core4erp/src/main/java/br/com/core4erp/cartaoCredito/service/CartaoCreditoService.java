package br.com.core4erp.cartaoCredito.service;

import br.com.core4erp.cartaoCredito.dto.*;
import br.com.core4erp.cartaoCredito.entity.CartaoCredito;
import br.com.core4erp.cartaoCredito.entity.LancamentoCartao;
import br.com.core4erp.cartaoCredito.repository.CartaoCreditoRepository;
import br.com.core4erp.cartaoCredito.repository.LancamentoCartaoRepository;
import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.conta.dto.ContaCreateDto;
import br.com.core4erp.conta.dto.ContaResponseDto;
import br.com.core4erp.conta.service.ContaService;
import br.com.core4erp.contaCorrente.service.ContaCorrenteService;
import br.com.core4erp.enums.TipoConta;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class CartaoCreditoService {

    private final CartaoCreditoRepository cartaoRepo;
    private final LancamentoCartaoRepository lancamentoRepo;
    private final CategoriaRepository categoriaRepo;
    private final ContaCorrenteService contaCorrenteService;
    private final ContaService contaService;
    private final SecurityContextUtils securityCtx;

    public CartaoCreditoService(CartaoCreditoRepository cartaoRepo,
                                LancamentoCartaoRepository lancamentoRepo,
                                CategoriaRepository categoriaRepo,
                                ContaCorrenteService contaCorrenteService,
                                ContaService contaService,
                                SecurityContextUtils securityCtx) {
        this.cartaoRepo = cartaoRepo;
        this.lancamentoRepo = lancamentoRepo;
        this.categoriaRepo = categoriaRepo;
        this.contaCorrenteService = contaCorrenteService;
        this.contaService = contaService;
        this.securityCtx = securityCtx;
    }

    // ── Cartões ───────────────────────────────────────────────────────────────

    public List<CartaoCreditoResponseDto> listar() {
        Long uid = securityCtx.getUsuarioId();
        return cartaoRepo.findAllByUsuarioId(uid).stream()
                .map(c -> CartaoCreditoResponseDto.from(c, calcularLimiteUsado(c)))
                .toList();
    }

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

    public List<LancamentoResponseDto> listarLancamentos(Long cartaoId, Integer mes, Integer ano) {
        Long uid = securityCtx.getUsuarioId();
        findOwnedCartao(cartaoId);
        List<LancamentoCartao> lista = (mes != null && ano != null)
                ? lancamentoRepo.findAllByCartaoCreditoIdAndUsuarioIdAndMesFaturaAndAnoFatura(cartaoId, uid, mes, ano)
                : lancamentoRepo.findAllByCartaoCreditoIdAndUsuarioId(cartaoId, uid);
        return lista.stream().map(LancamentoResponseDto::from).toList();
    }

    @Transactional
    public List<LancamentoResponseDto> criarLancamento(Long cartaoId, LancamentoRequestDto dto) {
        CartaoCredito cartao = findOwnedCartao(cartaoId);
        Long uid = securityCtx.getUsuarioId();

        Categoria categoria = categoriaRepo.findByIdAndUsuarioId(dto.categoriaId(), uid)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada"));

        int parcelas = (dto.quantidadeParcelas() == null || dto.quantidadeParcelas() < 1) ? 1 : dto.quantidadeParcelas();
        boolean dividir = Boolean.TRUE.equals(dto.dividirValor());
        BigDecimal valorParcela = dividir && parcelas > 1
                ? dto.valor().divide(BigDecimal.valueOf(parcelas), 2, RoundingMode.HALF_UP)
                : dto.valor();

        String grupo = parcelas > 1 ? UUID.randomUUID().toString() : null;
        Usuario usuario = securityCtx.getUsuario();
        List<LancamentoCartao> criados = new ArrayList<>();

        for (int i = 0; i < parcelas; i++) {
            YearMonth ym = YearMonth.of(dto.anoFatura(), dto.mesFatura()).plusMonths(i);
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
            l.setUsuario(usuario);
            criados.add(lancamentoRepo.save(l));
        }

        return criados.stream().map(LancamentoResponseDto::from).toList();
    }

    @Transactional
    public LancamentoResponseDto atualizarLancamento(Long cartaoId, Long lancamentoId, LancamentoRequestDto dto) {
        LancamentoCartao l = findOwnedLancamento(cartaoId, lancamentoId);
        Long uid = securityCtx.getUsuarioId();
        Categoria cat = categoriaRepo.findByIdAndUsuarioId(dto.categoriaId(), uid)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada"));
        l.setDescricao(dto.descricao());
        l.setValor(dto.valor());
        l.setDataCompra(dto.dataCompra());
        l.setMesFatura(dto.mesFatura());
        l.setAnoFatura(dto.anoFatura());
        l.setCategoria(cat);
        return LancamentoResponseDto.from(lancamentoRepo.save(l));
    }

    @Transactional
    public void deletarLancamento(Long cartaoId, Long lancamentoId) {
        lancamentoRepo.delete(findOwnedLancamento(cartaoId, lancamentoId));
    }

    // ── Fechamento de fatura ──────────────────────────────────────────────────

    @Transactional
    public ContaResponseDto fecharFatura(Long cartaoId, FechamentoFaturaRequestDto dto) {
        CartaoCredito cartao = findOwnedCartao(cartaoId);
        Long uid = securityCtx.getUsuarioId();

        List<LancamentoCartao> lancamentos = lancamentoRepo
                .findAllByCartaoCreditoIdAndUsuarioIdAndMesFaturaAndAnoFatura(cartaoId, uid, dto.mes(), dto.ano());
        if (lancamentos.isEmpty()) {
            throw new IllegalStateException("SEM_LANCAMENTOS: Nenhum lançamento encontrado para esta fatura");
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
                categoriaDaFatura.getId(), null, 1, 1, false
        );

        List<ContaResponseDto> contas = contaService.criar(contaDto);
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

    private CartaoCredito findOwnedCartao(Long id) {
        return cartaoRepo.findByIdAndUsuarioId(id, securityCtx.getUsuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Cartão não encontrado: " + id));
    }

    private LancamentoCartao findOwnedLancamento(Long cartaoId, Long lancamentoId) {
        return lancamentoRepo.findByIdAndCartaoCreditoIdAndUsuarioId(lancamentoId, cartaoId, securityCtx.getUsuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Lançamento não encontrado: " + lancamentoId));
    }
}
