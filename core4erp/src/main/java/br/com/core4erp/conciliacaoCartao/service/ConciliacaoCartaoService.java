package br.com.core4erp.conciliacaoCartao.service;

import br.com.core4erp.cartaoCredito.entity.CartaoCredito;
import br.com.core4erp.cartaoCredito.entity.LancamentoCartao;
import br.com.core4erp.cartaoCredito.repository.CartaoCreditoRepository;
import br.com.core4erp.cartaoCredito.repository.LancamentoCartaoRepository;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.conciliacao.service.OfxDadosDto;
import br.com.core4erp.conciliacao.service.OfxTransacaoDto;
import br.com.core4erp.conciliacaoCartao.dto.*;
import br.com.core4erp.conciliacaoCartao.entity.ConciliacaoCartao;
import br.com.core4erp.conciliacaoCartao.entity.ConciliacaoCartaoItem;
import br.com.core4erp.conciliacaoCartao.enums.StatusConciliacaoCartao;
import br.com.core4erp.conciliacaoCartao.enums.StatusItemConciliacaoCartao;
import br.com.core4erp.conciliacaoCartao.repository.ConciliacaoCartaoItemRepository;
import br.com.core4erp.conciliacaoCartao.repository.ConciliacaoCartaoRepository;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.parceiro.repository.ParceiroRepository;
import br.com.core4erp.utils.FaturaHelper;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ConciliacaoCartaoService {

    private static final int SCORE_MINIMO = 50;
    private static final int JANELA_DIAS = 7;

    private final ConciliacaoCartaoRepository conciliacaoRepo;
    private final ConciliacaoCartaoItemRepository itemRepo;
    private final CartaoCreditoRepository cartaoRepo;
    private final LancamentoCartaoRepository lancamentoRepo;
    private final CategoriaRepository categoriaRepo;
    private final ParceiroRepository parceiroRepo;
    private final OfxCartaoParserService ofxParser;
    private final ConciliacaoCartaoScoreService scoreService;
    private final SecurityContextUtils securityCtx;
    private final TenantContext tenantCtx;

    public ConciliacaoCartaoService(ConciliacaoCartaoRepository conciliacaoRepo,
                                    ConciliacaoCartaoItemRepository itemRepo,
                                    CartaoCreditoRepository cartaoRepo,
                                    LancamentoCartaoRepository lancamentoRepo,
                                    CategoriaRepository categoriaRepo,
                                    ParceiroRepository parceiroRepo,
                                    OfxCartaoParserService ofxParser,
                                    ConciliacaoCartaoScoreService scoreService,
                                    SecurityContextUtils securityCtx,
                                    TenantContext tenantCtx) {
        this.conciliacaoRepo = conciliacaoRepo;
        this.itemRepo = itemRepo;
        this.cartaoRepo = cartaoRepo;
        this.lancamentoRepo = lancamentoRepo;
        this.categoriaRepo = categoriaRepo;
        this.parceiroRepo = parceiroRepo;
        this.ofxParser = ofxParser;
        this.scoreService = scoreService;
        this.securityCtx = securityCtx;
        this.tenantCtx = tenantCtx;
    }

    @Transactional(readOnly = true)
    public List<ConciliacaoCartaoResponseDto> listar() {
        return conciliacaoRepo
                .findAllByEmpresaIdOrderByDataConciliacaoDesc(tenantCtx.getEmpresaId())
                .stream()
                .map(ConciliacaoCartaoResponseDto::fromSemItens)
                .toList();
    }

    @Transactional(readOnly = true)
    public ConciliacaoCartaoResponseDto buscar(Long id) {
        ConciliacaoCartao c = findOwned(id);
        List<ConciliacaoCartaoItemResponseDto> itens = itemRepo.findAllByConciliacaoCartaoId(id)
                .stream().map(ConciliacaoCartaoItemResponseDto::from).toList();
        return ConciliacaoCartaoResponseDto.from(c, itens);
    }

    @Transactional(readOnly = true)
    public ConciliacaoCartaoRelatorioDto relatorio(Long id) {
        ConciliacaoCartao c = findOwned(id);
        List<ConciliacaoCartaoItem> itens = itemRepo.findAllByConciliacaoCartaoId(id);

        int ignorados = (int) itens.stream()
                .filter(i -> i.getStatusItem() == StatusItemConciliacaoCartao.IGNORADO).count();
        int manuais = (int) itens.stream()
                .filter(i -> i.getStatusItem() == StatusItemConciliacaoCartao.VINCULADO_MANUALMENTE
                        || (i.getStatusItem() == StatusItemConciliacaoCartao.BAIXADO && i.getLancamentoCriadoAqui()))
                .count();

        List<ConciliacaoCartaoItemResponseDto> dtos = itens.stream()
                .map(ConciliacaoCartaoItemResponseDto::from).toList();
        return ConciliacaoCartaoRelatorioDto.from(c, ignorados, manuais, dtos);
    }

    @Transactional
    public ConciliacaoCartaoResponseDto processar(MultipartFile arquivo, Long cartaoIdForcado) {
        validarArquivo(arquivo);

        OfxDadosDto ofxDados;
        try {
            ofxDados = ofxParser.parse(arquivo);
        } catch (Exception e) {
            throw new IllegalArgumentException("Arquivo OFX inválido: " + e.getMessage());
        }

        if (ofxDados.getTransacoes() == null || ofxDados.getTransacoes().isEmpty()) {
            throw new IllegalArgumentException("Nenhuma transação encontrada no arquivo OFX");
        }

        Long empresaId = tenantCtx.getEmpresaId();
        CartaoCredito cartao;

        if (cartaoIdForcado != null) {
            cartao = cartaoRepo.findByIdAndEmpresaId(cartaoIdForcado, empresaId)
                    .orElseThrow(() -> new EntityNotFoundException("Cartão não encontrado"));
            if (cartao.getAcctIdOfx() == null && ofxDados.getNumeroConta() != null) {
                cartao.setAcctIdOfx(ofxDados.getNumeroConta());
                cartaoRepo.save(cartao);
            }
        } else {
            String acctId = ofxDados.getNumeroConta();
            cartao = cartaoRepo.findByAcctIdOfxAndEmpresaId(acctId, empresaId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.UNPROCESSABLE_ENTITY,
                            "CARTAO_NAO_ENCONTRADO:" + acctId));
        }

        if (ofxDados.getDataInicio() != null && ofxDados.getDataFim() != null
                && conciliacaoRepo.existsByCartaoCreditoIdAndDataInicioOfxAndDataFimOfxAndStatusNot(
                cartao.getId(), ofxDados.getDataInicio(), ofxDados.getDataFim(), StatusConciliacaoCartao.CANCELADA)) {
            throw new IllegalStateException("Este período OFX já foi importado para este cartão");
        }

        ConciliacaoCartao conciliacao = new ConciliacaoCartao();
        conciliacao.setDataConciliacao(LocalDateTime.now());
        conciliacao.setCartaoCredito(cartao);
        conciliacao.setStatus(StatusConciliacaoCartao.PENDENTE);
        conciliacao.setAcctIdOfx(ofxDados.getNumeroConta());
        conciliacao.setDataInicioOfx(ofxDados.getDataInicio());
        conciliacao.setDataFimOfx(ofxDados.getDataFim());
        conciliacao.setUsuario(securityCtx.getUsuario());
        conciliacao = conciliacaoRepo.save(conciliacao);

        int totalSugeridos = 0;
        int totalNaoIdentificados = 0;

        for (OfxTransacaoDto ofxTrn : ofxDados.getTransacoes()) {
            if (itemRepo.existsByConciliacaoCartaoIdAndOfxId(conciliacao.getId(), ofxTrn.getOfxId())) {
                continue;
            }

            ConciliacaoCartaoItem item = new ConciliacaoCartaoItem();
            item.setConciliacaoCartao(conciliacao);
            item.setOfxId(ofxTrn.getOfxId());
            item.setOfxTipo(ofxTrn.getTipo());
            item.setOfxValor(ofxTrn.getValor());
            item.setOfxData(ofxTrn.getData());
            item.setOfxMemo(ofxTrn.getMemo());
            item.setUsuario(securityCtx.getUsuario());

            // Transações CREDIT (estornos/pagamentos) não têm lançamento correspondente
            if ("CREDIT".equalsIgnoreCase(ofxTrn.getTipo())) {
                item.setStatusItem(StatusItemConciliacaoCartao.NAO_IDENTIFICADO);
                totalNaoIdentificados++;
                itemRepo.save(item);
                continue;
            }

            if (ofxTrn.getData() != null) {
                List<LancamentoCartao> candidatos = lancamentoRepo.findCandidatasParaConciliacao(
                        cartao.getId(), empresaId,
                        ofxTrn.getData().minusDays(JANELA_DIAS),
                        ofxTrn.getData().plusDays(JANELA_DIAS));

                LancamentoCartao melhor = null;
                int melhorScore = 0;
                for (LancamentoCartao candidato : candidatos) {
                    int score = scoreService.calcular(ofxTrn, candidato);
                    if (score > melhorScore) {
                        melhorScore = score;
                        melhor = candidato;
                    }
                }

                if (melhor != null && melhorScore >= SCORE_MINIMO) {
                    item.setLancamento(melhor);
                    item.setScoreVinculacao(melhorScore);
                    item.setStatusItem(StatusItemConciliacaoCartao.SUGERIDO);
                    totalSugeridos++;
                } else {
                    item.setStatusItem(StatusItemConciliacaoCartao.NAO_IDENTIFICADO);
                    totalNaoIdentificados++;
                }
            } else {
                item.setStatusItem(StatusItemConciliacaoCartao.NAO_IDENTIFICADO);
                totalNaoIdentificados++;
            }

            itemRepo.save(item);
        }

        conciliacao.setTotalTransacoes(ofxDados.getTransacoes().size());
        conciliacao.setTotalConciliados(totalSugeridos);
        conciliacao.setTotalNaoIdentificados(totalNaoIdentificados);
        conciliacao = conciliacaoRepo.save(conciliacao);

        List<ConciliacaoCartaoItemResponseDto> itensDto = itemRepo.findAllByConciliacaoCartaoId(conciliacao.getId())
                .stream().map(ConciliacaoCartaoItemResponseDto::from).toList();
        return ConciliacaoCartaoResponseDto.from(conciliacao, itensDto);
    }

    @Transactional
    public ConciliacaoCartaoItemResponseDto vincularItem(Long conciliacaoId, Long itemId, VincularLancamentoRequestDto dto) {
        ConciliacaoCartao c = findOwned(conciliacaoId);
        assertPendente(c);

        ConciliacaoCartaoItem item = findItem(itemId, conciliacaoId);
        LancamentoCartao lanc = lancamentoRepo.findByIdAndCartaoCreditoIdAndEmpresaId(
                dto.lancamentoId(), c.getCartaoCredito().getId(), tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Lançamento não encontrado"));

        item.setLancamento(lanc);
        item.setScoreVinculacao(null);
        item.setStatusItem(StatusItemConciliacaoCartao.VINCULADO_MANUALMENTE);
        return ConciliacaoCartaoItemResponseDto.from(itemRepo.save(item));
    }

    @Transactional
    public ConciliacaoCartaoItemResponseDto criarLancamentoEVincular(Long conciliacaoId, Long itemId,
                                                                      CriarLancamentoParaConciliacaoRequestDto dto) {
        ConciliacaoCartao c = findOwned(conciliacaoId);
        assertPendente(c);

        ConciliacaoCartaoItem item = findItem(itemId, conciliacaoId);
        Long eid = tenantCtx.getEmpresaId();

        var categoria = categoriaRepo.findByIdAndEmpresaId(dto.categoriaId(), eid)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada"));
        var parceiro = dto.parceiroId() != null
                ? parceiroRepo.findByIdAndEmpresaId(dto.parceiroId(), eid)
                .orElseThrow(() -> new EntityNotFoundException("Parceiro não encontrado"))
                : null;

        CartaoCredito cartaoConc = c.getCartaoCredito();
        java.time.YearMonth fatura = FaturaHelper.calcularFatura(dto.dataCompra(), cartaoConc.getDiaFechamento());

        LancamentoCartao novoLanc = new LancamentoCartao();
        novoLanc.setDescricao(dto.descricao());
        novoLanc.setValor(dto.valor());
        novoLanc.setDataCompra(dto.dataCompra());
        novoLanc.setMesFatura(fatura.getMonthValue());
        novoLanc.setAnoFatura(fatura.getYear());
        novoLanc.setNumeroParcela(1);
        novoLanc.setTotalParcelas(1);
        novoLanc.setCartaoCredito(c.getCartaoCredito());
        novoLanc.setCategoria(categoria);
        novoLanc.setParceiro(parceiro);
        novoLanc.setUsuario(securityCtx.getUsuario());
        novoLanc = lancamentoRepo.save(novoLanc);

        item.setLancamento(novoLanc);
        item.setScoreVinculacao(null);
        item.setStatusItem(StatusItemConciliacaoCartao.VINCULADO_MANUALMENTE);
        item.setLancamentoCriadoAqui(true);
        return ConciliacaoCartaoItemResponseDto.from(itemRepo.save(item));
    }

    @Transactional
    public ConciliacaoCartaoItemResponseDto ignorarItem(Long conciliacaoId, Long itemId) {
        ConciliacaoCartao c = findOwned(conciliacaoId);
        assertPendente(c);
        ConciliacaoCartaoItem item = findItem(itemId, conciliacaoId);
        item.setLancamento(null);
        item.setStatusItem(StatusItemConciliacaoCartao.IGNORADO);
        return ConciliacaoCartaoItemResponseDto.from(itemRepo.save(item));
    }

    @Transactional
    public ConciliacaoCartaoItemResponseDto desfazerIgnorarItem(Long conciliacaoId, Long itemId) {
        ConciliacaoCartao c = findOwned(conciliacaoId);
        assertPendente(c);
        ConciliacaoCartaoItem item = findItem(itemId, conciliacaoId);
        if (item.getStatusItem() != StatusItemConciliacaoCartao.IGNORADO) {
            throw new IllegalStateException("Item não está ignorado");
        }
        item.setStatusItem(StatusItemConciliacaoCartao.NAO_IDENTIFICADO);
        return ConciliacaoCartaoItemResponseDto.from(itemRepo.save(item));
    }

    @Transactional
    public ConciliacaoCartaoItemResponseDto desvincularItem(Long conciliacaoId, Long itemId) {
        ConciliacaoCartao c = findOwned(conciliacaoId);
        assertPendente(c);
        ConciliacaoCartaoItem item = findItem(itemId, conciliacaoId);
        item.setLancamento(null);
        item.setScoreVinculacao(null);
        item.setStatusItem(StatusItemConciliacaoCartao.NAO_IDENTIFICADO);
        return ConciliacaoCartaoItemResponseDto.from(itemRepo.save(item));
    }

    @Transactional
    public ConciliacaoCartaoResponseDto finalizar(Long id, FinalizarConciliacaoCartaoRequestDto dto) {
        ConciliacaoCartao c = findOwned(id);
        assertPendente(c);

        List<ConciliacaoCartaoItem> itensParaBaixar = itemRepo.findAllByConciliacaoCartaoIdAndStatusItemIn(
                id, List.of(StatusItemConciliacaoCartao.SUGERIDO, StatusItemConciliacaoCartao.VINCULADO_MANUALMENTE));

        int baixados = 0;
        for (ConciliacaoCartaoItem item : itensParaBaixar) {
            if (item.getLancamento() == null) continue;
            item.setLancamentoBaixado(true);
            item.setStatusItem(StatusItemConciliacaoCartao.BAIXADO);
            itemRepo.save(item);
            baixados++;
        }

        c.setStatus(StatusConciliacaoCartao.FINALIZADA);
        c.setDataConciliacao(LocalDateTime.now());
        c.setTotalConciliados(baixados);
        if (dto != null && dto.observacao() != null) {
            c.setObservacao(dto.observacao());
        }
        c = conciliacaoRepo.save(c);

        List<ConciliacaoCartaoItemResponseDto> itensDto = itemRepo.findAllByConciliacaoCartaoId(id)
                .stream().map(ConciliacaoCartaoItemResponseDto::from).toList();
        return ConciliacaoCartaoResponseDto.from(c, itensDto);
    }

    @Transactional
    public void cancelar(Long id) {
        ConciliacaoCartao c = findOwned(id);
        assertPendente(c);
        c.setStatus(StatusConciliacaoCartao.CANCELADA);
        conciliacaoRepo.save(c);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private ConciliacaoCartao findOwned(Long id) {
        return conciliacaoRepo.findByIdAndEmpresaId(id, tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Conciliação de cartão não encontrada: " + id));
    }

    private ConciliacaoCartaoItem findItem(Long itemId, Long conciliacaoId) {
        return itemRepo.findByIdAndConciliacaoCartaoId(itemId, conciliacaoId)
                .orElseThrow(() -> new EntityNotFoundException("Item de conciliação não encontrado: " + itemId));
    }

    private void assertPendente(ConciliacaoCartao c) {
        if (c.getStatus() != StatusConciliacaoCartao.PENDENTE) {
            throw new IllegalStateException("Conciliação de cartão não está PENDENTE");
        }
    }

    private void validarArquivo(MultipartFile arquivo) {
        if (arquivo.isEmpty()) throw new IllegalArgumentException("Arquivo vazio");
        String nome = arquivo.getOriginalFilename();
        if (nome == null || !nome.toLowerCase().endsWith(".ofx")) {
            throw new IllegalArgumentException("Apenas arquivos .ofx são aceitos");
        }
        if (arquivo.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("Arquivo excede o tamanho máximo de 5 MB");
        }
    }
}
