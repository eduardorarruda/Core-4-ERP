package br.com.core4erp.conciliacao.service;

import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.conciliacao.dto.*;
import br.com.core4erp.conciliacao.entity.Conciliacao;
import br.com.core4erp.conciliacao.entity.ConciliacaoItem;
import br.com.core4erp.conciliacao.enums.StatusConciliacao;
import br.com.core4erp.conciliacao.enums.StatusItemConciliacao;
import br.com.core4erp.conciliacao.repository.ConciliacaoItemRepository;
import br.com.core4erp.conciliacao.repository.ConciliacaoRepository;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.conta.dto.BaixaRequestDto;
import br.com.core4erp.conta.dto.ContaCreateDto;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.entity.ContaBaixada;
import br.com.core4erp.conta.repository.ContaBaixadaRepository;
import br.com.core4erp.conta.repository.ContaRepository;
import br.com.core4erp.conta.service.ContaService;
import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import br.com.core4erp.contaCorrente.repository.ContaCorrenteRepository;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.parceiro.repository.ParceiroRepository;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ConciliacaoService {

    private static final int SCORE_MINIMO = 50;
    private static final BigDecimal TOLERANCIA_VALOR = new BigDecimal("10");

    private final ConciliacaoRepository conciliacaoRepository;
    private final ConciliacaoItemRepository itemRepository;
    private final ContaRepository contaRepository;
    private final ContaBaixadaRepository contaBaixadaRepository;
    private final ContaCorrenteRepository contaCorrenteRepository;
    private final CategoriaRepository categoriaRepository;
    private final ParceiroRepository parceiroRepository;
    private final ContaService contaService;
    private final OfxParserService ofxParserService;
    private final SecurityContextUtils securityCtx;

    public ConciliacaoService(ConciliacaoRepository conciliacaoRepository,
                               ConciliacaoItemRepository itemRepository,
                               ContaRepository contaRepository,
                               ContaBaixadaRepository contaBaixadaRepository,
                               ContaCorrenteRepository contaCorrenteRepository,
                               CategoriaRepository categoriaRepository,
                               ParceiroRepository parceiroRepository,
                               ContaService contaService,
                               OfxParserService ofxParserService,
                               SecurityContextUtils securityCtx) {
        this.conciliacaoRepository = conciliacaoRepository;
        this.itemRepository = itemRepository;
        this.contaRepository = contaRepository;
        this.contaBaixadaRepository = contaBaixadaRepository;
        this.contaCorrenteRepository = contaCorrenteRepository;
        this.categoriaRepository = categoriaRepository;
        this.parceiroRepository = parceiroRepository;
        this.contaService = contaService;
        this.ofxParserService = ofxParserService;
        this.securityCtx = securityCtx;
    }

    @Transactional(readOnly = true)
    public List<ConciliacaoResponseDto> listar() {
        return conciliacaoRepository
                .findAllByUsuarioIdOrderByDataConciliacaoDesc(securityCtx.getUsuarioId())
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

        Long usuarioId = securityCtx.getUsuarioId();
        ContaCorrente contaCorrente;

        if (contaCorrenteIdForcado != null) {
            contaCorrente = contaCorrenteRepository.findByIdAndUsuarioId(contaCorrenteIdForcado, usuarioId)
                    .orElseThrow(() -> new EntityNotFoundException("Conta corrente não encontrada"));
        } else {
            String numeroConta = ofxDados.getNumeroConta();
            contaCorrente = contaCorrenteRepository.findByNumeroContaAndUsuarioId(numeroConta, usuarioId)
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
                    .findCandidatasParaConciliacao(usuarioId, statusesAbertos, valorAbs, TOLERANCIA_VALOR);

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
                int score = calcularScore(ofxTrn, candidata);
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
        Conta conta = contaRepository.findByIdAndUsuarioId(dto.contaId(), securityCtx.getUsuarioId())
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
        Long usuarioId = securityCtx.getUsuarioId();

        var categoria = categoriaRepository.findByIdAndUsuarioId(dto.categoriaId(), usuarioId)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada"));

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
        Conta novaConta = contaRepository.findByIdAndUsuarioId(criadas.get(0).id(), usuarioId)
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
                ContaBaixada baixada = contaBaixadaRepository.findByContaId(item.getConta().getId()).orElse(null);
                item.setContaBaixada(baixada);
                item.setStatusItem(StatusItemConciliacao.BAIXADO);
                itemRepository.save(item);
                baixados++;
            } catch (IllegalStateException e) {
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

    // ── Score algorithm ───────────────────────────────────────────────────────

    private int calcularScore(OfxTransacaoDto ofxTrn, Conta conta) {
        int score = 0;
        BigDecimal valorOfx = ofxTrn.getValor().abs();
        BigDecimal valorConta = conta.getValorOriginal().abs();

        if (valorOfx.compareTo(valorConta) == 0) {
            score += 40;
        } else if (valorOfx.subtract(valorConta).abs().compareTo(new BigDecimal("0.05")) <= 0) {
            score += 20;
        }

        if (ofxTrn.getData() != null && conta.getDataVencimento() != null) {
            long dias = Math.abs(ChronoUnit.DAYS.between(ofxTrn.getData(), conta.getDataVencimento()));
            if (dias == 0) score += 30;
            else if (dias <= 3) score += 15;
        }

        if (ofxTrn.getMemo() != null && conta.getDescricao() != null) {
            double sim = calcularJaccard(normalizar(ofxTrn.getMemo()), normalizar(conta.getDescricao()));
            if (sim >= 0.6) score += 20;
            else if (sim >= 0.3) score += 10;
        }

        if (conta.getParceiro() != null && ofxTrn.getMemo() != null) {
            String nomeParc = conta.getParceiro().getNomeFantasia() != null
                    ? conta.getParceiro().getNomeFantasia()
                    : conta.getParceiro().getRazaoSocial();
            if (nomeParc != null && !nomeParc.isBlank()) {
                String prefixo = normalizar(nomeParc);
                prefixo = prefixo.substring(0, Math.min(5, prefixo.length()));
                if (!prefixo.isBlank() && normalizar(ofxTrn.getMemo()).contains(prefixo)) {
                    score += 10;
                }
            }
        }

        return score;
    }

    private double calcularJaccard(String a, String b) {
        Set<String> bg_a = bigramas(a);
        Set<String> bg_b = bigramas(b);
        if (bg_a.isEmpty() || bg_b.isEmpty()) return 0;
        Set<String> intersecao = new HashSet<>(bg_a);
        intersecao.retainAll(bg_b);
        Set<String> uniao = new HashSet<>(bg_a);
        uniao.addAll(bg_b);
        return (double) intersecao.size() / uniao.size();
    }

    private Set<String> bigramas(String s) {
        Set<String> bg = new HashSet<>();
        for (int i = 0; i < s.length() - 1; i++) bg.add(s.substring(i, i + 2));
        return bg;
    }

    private String normalizar(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD)
                .replaceAll("[^\\p{ASCII}]", "")
                .toLowerCase()
                .replaceAll("[^a-z0-9]", " ")
                .trim();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private Conciliacao findOwned(Long id) {
        return conciliacaoRepository.findByIdAndUsuarioId(id, securityCtx.getUsuarioId())
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
