package br.com.core4erp.conciliacao.service;

import br.com.core4erp.conciliacao.dto.*;
import br.com.core4erp.conciliacao.entity.Conciliacao;
import br.com.core4erp.conciliacao.entity.ConciliacaoItem;
import br.com.core4erp.conciliacao.enums.StatusConciliacao;
import br.com.core4erp.conciliacao.enums.StatusItemConciliacao;
import br.com.core4erp.conciliacao.repository.ConciliacaoItemRepository;
import br.com.core4erp.conciliacao.repository.ConciliacaoRepository;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.conta.dto.BaixaRequestDto;
import br.com.core4erp.conta.dto.ContaCreateDto;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.entity.ContaBaixada;
import br.com.core4erp.conta.repository.ContaBaixadaRepository;
import br.com.core4erp.conta.repository.ContaRepository;
import br.com.core4erp.conta.service.ContaService;
import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.contaCorrente.repository.ContaCorrenteRepository;
import br.com.core4erp.enums.StatusConta;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class ConciliacaoService {

    private static final Logger log = LoggerFactory.getLogger(ConciliacaoService.class);
    private static final int SCORE_MINIMO = 50;
    private static final BigDecimal TOLERANCIA_VALOR = new BigDecimal("10");

    private final ConciliacaoRepository conciliacaoRepository;
    private final ConciliacaoItemRepository itemRepository;
    private final ContaRepository contaRepository;
    private final ContaBaixadaRepository contaBaixadaRepository;
    private final ContaCorrenteRepository contaCorrenteRepository;
    private final ContaService contaService;
    private final OfxParserService ofxParserService;
    private final ConciliacaoScoreService scoreService;
    private final SecurityContextUtils securityCtx;
    private final TenantContext tenantCtx;

    public ConciliacaoService(ConciliacaoRepository conciliacaoRepository,
                               ConciliacaoItemRepository itemRepository,
                               ContaRepository contaRepository,
                               ContaBaixadaRepository contaBaixadaRepository,
                               ContaCorrenteRepository contaCorrenteRepository,
                               ContaService contaService,
                               OfxParserService ofxParserService,
                               ConciliacaoScoreService scoreService,
                               SecurityContextUtils securityCtx,
                               TenantContext tenantCtx) {
        this.conciliacaoRepository = conciliacaoRepository;
        this.itemRepository = itemRepository;
        this.contaRepository = contaRepository;
        this.contaBaixadaRepository = contaBaixadaRepository;
        this.contaCorrenteRepository = contaCorrenteRepository;
        this.contaService = contaService;
        this.ofxParserService = ofxParserService;
        this.scoreService = scoreService;
        this.securityCtx = securityCtx;
        this.tenantCtx = tenantCtx;
    }

    @Transactional(readOnly = true)
    public List<ConciliacaoResponseDto> listar() {
        return conciliacaoRepository
                .findAllByEmpresaIdOrderByDataConciliacaoDesc(tenantCtx.getEmpresaId())
                .stream()
                .map(ConciliacaoResponseDto::fromSemItens)
                .toList();
    }

    @Transactional(readOnly = true)
    public ConciliacaoResponseDto buscar(Long id) {
        Conciliacao c = findOwned(id);
        List<ConciliacaoItemResponseDto> itens = itemRepository.findAllByConciliacaoId(id)
                .stream().map(ConciliacaoItemResponseDto::from).toList();
        return ConciliacaoResponseDto.from(c, itens);
    }

    @Transactional(readOnly = true)
    public ConciliacaoRelatorioDto relatorio(Long id) {
        Conciliacao c = findOwned(id);
        List<ConciliacaoItem> itens = itemRepository.findAllByConciliacaoId(id);

        int ignorados = (int) itens.stream()
                .filter(i -> i.getStatusItem() == StatusItemConciliacao.IGNORADO).count();
        int manuais = (int) itens.stream()
                .filter(i -> i.getStatusItem() == StatusItemConciliacao.VINCULADO_MANUALMENTE
                        || i.getStatusItem() == StatusItemConciliacao.BAIXADO && i.getContaCriadaAqui()).count();

        List<ConciliacaoItemResponseDto> dtos = itens.stream()
                .map(ConciliacaoItemResponseDto::from).toList();
        return ConciliacaoRelatorioDto.from(c, ignorados, manuais, dtos);
    }

    @Transactional
    public ConciliacaoResponseDto processar(MultipartFile arquivo, Long contaCorrenteIdForcado) {
        if (arquivo.isEmpty()) {
            throw new IllegalArgumentException("Arquivo vazio");
        }
        String nomeArquivo = arquivo.getOriginalFilename();
        if (nomeArquivo == null || !nomeArquivo.toLowerCase().endsWith(".ofx")) {
            throw new IllegalArgumentException("Apenas arquivos .ofx são aceitos");
        }
        if (arquivo.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("Arquivo excede o tamanho máximo de 5 MB");
        }
        String contentType = arquivo.getContentType();
        if (contentType != null && !contentType.isBlank()) {
            boolean tipoPermitido = contentType.startsWith("text/") ||
                    contentType.equals("application/x-ofx") ||
                    contentType.equals("application/vnd.intu.qbo") ||
                    contentType.equals("application/octet-stream");
            if (!tipoPermitido) {
                throw new IllegalArgumentException("Tipo de arquivo não permitido: " + contentType);
            }
        }

        OfxDadosDto ofxDados;
        try {
            ofxDados = ofxParserService.parse(arquivo);
        } catch (Exception e) {
            throw new IllegalArgumentException("Arquivo OFX inválido: " + e.getMessage());
        }

        if (ofxDados.getTransacoes() == null || ofxDados.getTransacoes().isEmpty()) {
            throw new IllegalArgumentException("Nenhuma transação encontrada no arquivo OFX");
        }

        Long empresaId = tenantCtx.getEmpresaId();
        ContaCorrente contaCorrente;

        if (contaCorrenteIdForcado != null) {
            contaCorrente = contaCorrenteRepository.findByIdAndEmpresaId(contaCorrenteIdForcado, empresaId)
                    .orElseThrow(() -> new EntityNotFoundException("Conta corrente não encontrada"));
        } else {
            String numeroConta = ofxDados.getNumeroConta();
            contaCorrente = contaCorrenteRepository.findByNumeroContaAndEmpresaId(numeroConta, empresaId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.UNPROCESSABLE_ENTITY,
                            "CONTA_NAO_ENCONTRADA:" + numeroConta));
        }

        Conciliacao conciliacao = new Conciliacao();
        conciliacao.setDataConciliacao(LocalDateTime.now());
        conciliacao.setContaCorrente(contaCorrente);
        conciliacao.setStatus(StatusConciliacao.PENDENTE);
        conciliacao.setBancoId(ofxDados.getBancoId());
        conciliacao.setAgencia(ofxDados.getAgencia());
        conciliacao.setNumeroContaOfx(ofxDados.getNumeroConta());
        conciliacao.setDataInicioOfx(ofxDados.getDataInicio());
        conciliacao.setDataFimOfx(ofxDados.getDataFim());
        conciliacao.setUsuario(securityCtx.getUsuario());
        conciliacao = conciliacaoRepository.save(conciliacao);

        int totalSugeridos = 0;
        int totalNaoIdentificados = 0;
        List<StatusConta> statusesAbertos = List.of(StatusConta.PENDENTE, StatusConta.ATRASADO);

        for (OfxTransacaoDto ofxTrn : ofxDados.getTransacoes()) {
            if (itemRepository.existsByConciliacaoIdAndOfxId(conciliacao.getId(), ofxTrn.getOfxId())) {
                continue;
            }

            BigDecimal valorAbs = ofxTrn.getValor().abs();
            List<Conta> candidatas = contaRepository
                    .findCandidatasParaConciliacao(empresaId, statusesAbertos, valorAbs, TOLERANCIA_VALOR);

            ConciliacaoItem item = new ConciliacaoItem();
            item.setConciliacao(conciliacao);
            item.setOfxId(ofxTrn.getOfxId());
            item.setOfxTipo(ofxTrn.getTipo());
            item.setOfxValor(ofxTrn.getValor());
            item.setOfxData(ofxTrn.getData());
            item.setOfxMemo(ofxTrn.getMemo());
            item.setOfxNome(ofxTrn.getNome());
            item.setUsuario(securityCtx.getUsuario());

            Conta melhor = null;
            int melhorScore = 0;
            for (Conta candidata : candidatas) {
                int score = scoreService.calcular(ofxTrn, candidata);
                if (score > melhorScore) {
                    melhorScore = score;
                    melhor = candidata;
                }
            }

            if (melhor != null && melhorScore >= SCORE_MINIMO) {
                item.setConta(melhor);
                item.setScoreVinculacao(melhorScore);
                item.setStatusItem(StatusItemConciliacao.SUGERIDO);
                totalSugeridos++;
            } else {
                item.setStatusItem(StatusItemConciliacao.NAO_IDENTIFICADO);
                totalNaoIdentificados++;
            }

            itemRepository.save(item);
        }

        conciliacao.setTotalTransacoes(ofxDados.getTransacoes().size());
        conciliacao.setTotalConciliados(totalSugeridos);
        conciliacao.setTotalNaoIdentificados(totalNaoIdentificados);
        conciliacao = conciliacaoRepository.save(conciliacao);

        List<ConciliacaoItemResponseDto> itensDto = itemRepository.findAllByConciliacaoId(conciliacao.getId())
                .stream().map(ConciliacaoItemResponseDto::from).toList();
        return ConciliacaoResponseDto.from(conciliacao, itensDto);
    }

    @Transactional
    public ConciliacaoItemResponseDto vincularItem(Long conciliacaoId, Long itemId, VincularItemRequestDto dto) {
        Conciliacao c = findOwned(conciliacaoId);
        assertPendente(c);

        ConciliacaoItem item = findItem(itemId, conciliacaoId);
        Conta conta = contaRepository.findByIdAndEmpresaId(dto.contaId(), tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Conta não encontrada"));

        item.setConta(conta);
        item.setScoreVinculacao(null);
        item.setStatusItem(StatusItemConciliacao.VINCULADO_MANUALMENTE);
        return ConciliacaoItemResponseDto.from(itemRepository.save(item));
    }

    @Transactional
    public ConciliacaoItemResponseDto criarContaEVincular(Long conciliacaoId, Long itemId,
                                                           CriarContaParaConciliacaoRequestDto dto) {
        Conciliacao c = findOwned(conciliacaoId);
        assertPendente(c);

        ConciliacaoItem item = findItem(itemId, conciliacaoId);
        Long empresaId = tenantCtx.getEmpresaId();

        var contaCreateDto = new ContaCreateDto(
                dto.descricao(),
                dto.valorOriginal(),
                dto.dataVencimento(),
                dto.tipo(),
                dto.categoriaId(),
                dto.parceiroId(),
                1, 1, false, null, BigDecimal.ZERO, BigDecimal.ZERO
        );
        var criadas = contaService.criar(contaCreateDto);
        Conta novaConta = contaRepository.findByIdAndEmpresaId(criadas.get(0).id(), empresaId)
                .orElseThrow();

        item.setConta(novaConta);
        item.setScoreVinculacao(null);
        item.setStatusItem(StatusItemConciliacao.VINCULADO_MANUALMENTE);
        item.setContaCriadaAqui(true);
        return ConciliacaoItemResponseDto.from(itemRepository.save(item));
    }

    @Transactional
    public ConciliacaoItemResponseDto ignorarItem(Long conciliacaoId, Long itemId) {
        Conciliacao c = findOwned(conciliacaoId);
        assertPendente(c);

        ConciliacaoItem item = findItem(itemId, conciliacaoId);
        item.setConta(null);
        item.setStatusItem(StatusItemConciliacao.IGNORADO);
        return ConciliacaoItemResponseDto.from(itemRepository.save(item));
    }

    @Transactional
    public ConciliacaoItemResponseDto desfazerIgnorarItem(Long conciliacaoId, Long itemId) {
        Conciliacao c = findOwned(conciliacaoId);
        assertPendente(c);

        ConciliacaoItem item = findItem(itemId, conciliacaoId);
        if (item.getStatusItem() != StatusItemConciliacao.IGNORADO) {
            throw new IllegalStateException("Item não está ignorado");
        }
        item.setStatusItem(StatusItemConciliacao.NAO_IDENTIFICADO);
        return ConciliacaoItemResponseDto.from(itemRepository.save(item));
    }

    @Transactional
    public ConciliacaoItemResponseDto desvincularItem(Long conciliacaoId, Long itemId) {
        Conciliacao c = findOwned(conciliacaoId);
        assertPendente(c);

        ConciliacaoItem item = findItem(itemId, conciliacaoId);
        item.setConta(null);
        item.setScoreVinculacao(null);
        item.setStatusItem(StatusItemConciliacao.NAO_IDENTIFICADO);
        return ConciliacaoItemResponseDto.from(itemRepository.save(item));
    }

    @Transactional
    public ConciliacaoResponseDto finalizar(Long id, FinalizarConciliacaoRequestDto dto) {
        Conciliacao c = findOwned(id);
        assertPendente(c);

        List<ConciliacaoItem> itensParaBaixar = itemRepository.findAllByConciliacaoIdAndStatusItemIn(
                id, List.of(StatusItemConciliacao.SUGERIDO, StatusItemConciliacao.VINCULADO_MANUALMENTE));

        int baixados = 0;
        for (ConciliacaoItem item : itensParaBaixar) {
            if (item.getConta() == null) continue;

            BaixaRequestDto baixaDto = new BaixaRequestDto(
                    c.getContaCorrente().getId(),
                    item.getOfxData(),
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO
            );

            try {
                contaService.baixar(item.getConta().getId(), baixaDto);
                Conta contaBaixada2 = item.getConta();
                contaBaixada2.setConciliada(true);
                contaRepository.save(contaBaixada2);
                ContaBaixada baixada = contaBaixadaRepository.findByContaId(item.getConta().getId()).orElse(null);
                item.setContaBaixada(baixada);
                item.setStatusItem(StatusItemConciliacao.BAIXADO);
                itemRepository.save(item);
                baixados++;
            } catch (BusinessException e) {
                log.warn("Baixa ignorada na conciliação {}, item {}: [{}] {}", id, item.getId(), e.getCode(), e.getMessage());
                item.setStatusItem(StatusItemConciliacao.IGNORADO);
                itemRepository.save(item);
            } catch (IllegalStateException e) {
                log.warn("Baixa ignorada na conciliação {}, item {}: {}", id, item.getId(), e.getMessage());
                item.setStatusItem(StatusItemConciliacao.IGNORADO);
                itemRepository.save(item);
            }
        }

        c.setStatus(StatusConciliacao.FINALIZADA);
        c.setDataConciliacao(LocalDateTime.now());
        c.setTotalConciliados(baixados);
        if (dto != null && dto.observacao() != null) {
            c.setObservacao(dto.observacao());
        }
        c = conciliacaoRepository.save(c);

        List<ConciliacaoItemResponseDto> itensDto = itemRepository.findAllByConciliacaoId(id)
                .stream().map(ConciliacaoItemResponseDto::from).toList();
        return ConciliacaoResponseDto.from(c, itensDto);
    }

    @Transactional
    public void cancelar(Long id) {
        Conciliacao c = findOwned(id);
        assertPendente(c);
        c.setStatus(StatusConciliacao.CANCELADA);
        conciliacaoRepository.save(c);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Conciliacao findOwned(Long id) {
        return conciliacaoRepository.findByIdAndEmpresaId(id, tenantCtx.getEmpresaId())
                .orElseThrow(() -> new EntityNotFoundException("Conciliação não encontrada: " + id));
    }

    private ConciliacaoItem findItem(Long itemId, Long conciliacaoId) {
        return itemRepository.findByIdAndConciliacaoId(itemId, conciliacaoId)
                .orElseThrow(() -> new EntityNotFoundException("Item de conciliação não encontrado: " + itemId));
    }

    private void assertPendente(Conciliacao c) {
        if (c.getStatus() != StatusConciliacao.PENDENTE) {
            throw new IllegalStateException("Conciliação não está PENDENTE");
        }
    }
}
