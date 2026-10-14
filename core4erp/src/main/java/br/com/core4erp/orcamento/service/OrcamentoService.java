package br.com.core4erp.orcamento.service;

import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.orcamento.dto.CategoriaOrcamentoDto;
import br.com.core4erp.orcamento.dto.OrcamentoItemResponseDto;
import br.com.core4erp.orcamento.dto.OrcamentoMesResponseDto;
import br.com.core4erp.orcamento.dto.OrcamentoRequestDto;
import br.com.core4erp.orcamento.dto.SugestaoOrcamentoResponseDto;
import br.com.core4erp.orcamento.entity.Orcamento;
import br.com.core4erp.orcamento.repository.GastoRepository;
import br.com.core4erp.orcamento.repository.OrcamentoRepository;
import br.com.core4erp.orcamento.service.OrcamentoCalculadora.HistoricoCategoria;
import br.com.core4erp.utils.MesReferencia;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Orçamento mensal por categoria. O gasto vem de {@link GastoRepository} (definição única de "gasto",
 * documentada lá) em UMA consulta agregada por requisição — sem carregar lançamentos em memória.
 */
@Service
public class OrcamentoService {

    static final String CODIGO_DUPLICADO = "ORCAMENTO_JA_EXISTE";

    private final OrcamentoRepository orcamentoRepo;
    private final GastoRepository gastoRepo;
    private final CategoriaRepository categoriaRepo;
    private final TenantContext tenantCtx;
    private final SecurityContextUtils securityCtx;
    private final Clock clock;

    @Autowired
    public OrcamentoService(OrcamentoRepository orcamentoRepo, GastoRepository gastoRepo,
                            CategoriaRepository categoriaRepo, TenantContext tenantCtx,
                            SecurityContextUtils securityCtx) {
        this(orcamentoRepo, gastoRepo, categoriaRepo, tenantCtx, securityCtx, Clock.system(MesReferencia.FUSO));
    }

    OrcamentoService(OrcamentoRepository orcamentoRepo, GastoRepository gastoRepo,
                     CategoriaRepository categoriaRepo, TenantContext tenantCtx,
                     SecurityContextUtils securityCtx, Clock clock) {
        this.orcamentoRepo = orcamentoRepo;
        this.gastoRepo = gastoRepo;
        this.categoriaRepo = categoriaRepo;
        this.tenantCtx = tenantCtx;
        this.securityCtx = securityCtx;
        this.clock = clock;
    }

    // ── Leitura ──────────────────────────────────────────────────────────────

    @Requer("ORCAMENTO_VISUALIZAR")
    @Transactional(readOnly = true)
    public OrcamentoMesResponseDto listar(YearMonth mesParam) {
        Long eid = tenantCtx.getEmpresaId();
        LocalDate hoje = LocalDate.now(clock);
        YearMonth mes = MesReferencia.resolver(mesParam, hoje);

        List<Orcamento> orcamentos = orcamentoRepo.findAtivosComCategoria(eid);
        Map<Long, HistoricoCategoria> historico = carregarHistorico(eid, mes);

        List<OrcamentoItemResponseDto> itens = orcamentos.stream()
                .map(o -> montarItem(o, historico.get(o.getCategoria().getId()), mes, hoje))
                .sorted(Comparator.comparing(OrcamentoItemResponseDto::percentual).reversed())
                .toList();

        BigDecimal totalLimite = somar(itens.stream().map(OrcamentoItemResponseDto::limite).toList());
        BigDecimal totalGasto = somar(itens.stream().map(OrcamentoItemResponseDto::gasto).toList());

        Set<Long> comOrcamento = orcamentos.stream().map(o -> o.getCategoria().getId()).collect(Collectors.toSet());
        BigDecimal semOrcamento = somar(historico.values().stream()
                .filter(h -> !comOrcamento.contains(h.categoriaId()))
                .map(h -> h.gastoEm(mes))
                .filter(v -> v.signum() > 0)
                .toList());

        return new OrcamentoMesResponseDto(
                mes.toString(),
                dataReferencia(mes, hoje),
                OrcamentoCalculadora.ritmoPercentual(mes, hoje),
                totalLimite,
                totalGasto,
                OrcamentoCalculadora.percentual(totalGasto, totalLimite),
                semOrcamento,
                itens);
    }

    /** Categorias principais ativas com gasto (no mês ou nos 3 anteriores) e SEM orçamento ativo. */
    @Requer("ORCAMENTO_VISUALIZAR")
    @Transactional(readOnly = true)
    public List<SugestaoOrcamentoResponseDto> sugestoes(YearMonth mesParam) {
        Long eid = tenantCtx.getEmpresaId();
        LocalDate hoje = LocalDate.now(clock);
        YearMonth mes = MesReferencia.resolver(mesParam, hoje);
        List<YearMonth> anteriores = OrcamentoCalculadora.mesesAnteriores(mes, OrcamentoCalculadora.MESES_MEDIA);

        Set<Long> comOrcamento = orcamentoRepo.findAtivosComCategoria(eid).stream()
                .map(o -> o.getCategoria().getId()).collect(Collectors.toSet());
        Set<Long> raizesAtivas = categoriaRepo.findByEmpresaIdAndAtivoTrue(eid).stream()
                .filter(c -> c.getCategoriaPai() == null)
                .map(Categoria::getId).collect(Collectors.toSet());

        return carregarHistorico(eid, mes).values().stream()
                .filter(h -> raizesAtivas.contains(h.categoriaId()) && !comOrcamento.contains(h.categoriaId()))
                .map(h -> new SugestaoOrcamentoResponseDto(
                        new CategoriaOrcamentoDto(h.categoriaId(), h.descricao(), h.icone()),
                        h.gastoEm(mes),
                        OrcamentoCalculadora.media(h.gastosEm(anteriores)),
                        OrcamentoCalculadora.sugestaoParaCategoriaSemLimite(h.gastosEm(anteriores), h.gastoEm(mes))))
                .filter(s -> s.sugestaoLimite() != null)
                .sorted(Comparator.comparing(SugestaoOrcamentoResponseDto::sugestaoLimite).reversed())
                .toList();
    }

    // ── Escrita ──────────────────────────────────────────────────────────────

    @Requer("ORCAMENTO_EDITAR")
    @Transactional
    public OrcamentoItemResponseDto criar(OrcamentoRequestDto dto) {
        Long eid = tenantCtx.getEmpresaId();
        Categoria categoria = categoriaValida(dto.categoriaId(), eid);
        exigirSemDuplicado(eid, categoria.getId());

        Orcamento o = new Orcamento();
        o.setCategoria(categoria);
        o.setValorLimite(dto.valorLimite());
        o.setUsuario(securityCtx.getUsuario());
        return itemDoMesAtual(orcamentoRepo.save(o), eid);
    }

    @Requer("ORCAMENTO_EDITAR")
    @Transactional
    public OrcamentoItemResponseDto atualizar(Long id, OrcamentoRequestDto dto) {
        Long eid = tenantCtx.getEmpresaId();
        Orcamento o = buscarAtivo(id, eid);
        if (!o.getCategoria().getId().equals(dto.categoriaId())) {
            Categoria nova = categoriaValida(dto.categoriaId(), eid);
            exigirSemDuplicado(eid, nova.getId());
            o.setCategoria(nova);
        }
        o.setValorLimite(dto.valorLimite());
        return itemDoMesAtual(orcamentoRepo.save(o), eid);
    }

    /** Soft delete: o orçamento é inativado (o histórico de alterações fica na auditoria JPA). */
    @Requer("ORCAMENTO_EDITAR")
    @Transactional
    public void deletar(Long id) {
        Orcamento o = buscarAtivo(id, tenantCtx.getEmpresaId());
        o.setAtivo(false);
        orcamentoRepo.save(o);
    }

    // ── Auxiliares ───────────────────────────────────────────────────────────

    private Orcamento buscarAtivo(Long id, Long eid) {
        return orcamentoRepo.findAtivoByIdAndEmpresaId(id, eid)
                .orElseThrow(() -> new EntityNotFoundException("Orçamento não encontrado. Ele pode ter sido removido."));
    }

    /**
     * A categoria precisa ser da empresa (lookup sempre com empresaId — id de outra empresa = 404),
     * estar ativa e ser PRINCIPAL: o gasto das subcategorias já soma no total da categoria-pai.
     * Obs.: o modelo de categoria não distingue receita/despesa, então não há como validar o "tipo".
     */
    private Categoria categoriaValida(Long categoriaId, Long eid) {
        Categoria c = categoriaRepo.findByIdAndEmpresaId(categoriaId, eid)
                .orElseThrow(() -> new EntityNotFoundException("Categoria não encontrada. Ela pode ter sido removida."));
        if (!Boolean.TRUE.equals(c.getAtivo())) {
            throw new IllegalArgumentException("Esta categoria está inativa. Reative-a antes de definir um orçamento.");
        }
        if (c.getCategoriaPai() != null) {
            throw new IllegalArgumentException(
                    "Defina o orçamento na categoria principal — os gastos das subcategorias já entram no total dela.");
        }
        return c;
    }

    private void exigirSemDuplicado(Long eid, Long categoriaId) {
        if (orcamentoRepo.existsByEmpresaIdAndCategoria_IdAndAtivoTrue(eid, categoriaId)) {
            throw new BusinessException(CODIGO_DUPLICADO,
                    "Esta categoria já tem um orçamento. Altere o limite existente em vez de criar outro.");
        }
    }

    private OrcamentoItemResponseDto itemDoMesAtual(Orcamento o, Long eid) {
        LocalDate hoje = LocalDate.now(clock);
        YearMonth mes = YearMonth.from(hoje);
        return montarItem(o, carregarHistorico(eid, mes).get(o.getCategoria().getId()), mes, hoje);
    }

    /** Uma consulta agregada: gasto por categoria-raiz do mês e dos 3 meses completos anteriores. */
    private Map<Long, HistoricoCategoria> carregarHistorico(Long eid, YearMonth mes) {
        LocalDate inicio = mes.minusMonths(OrcamentoCalculadora.MESES_MEDIA).atDay(1);
        return OrcamentoCalculadora.agruparPorCategoria(
                gastoRepo.gastoMensalPorCategoria(eid, inicio, mes.atEndOfMonth(), LocalDate.now(clock)));
    }

    private static OrcamentoItemResponseDto montarItem(Orcamento o, HistoricoCategoria historico,
                                                       YearMonth mes, LocalDate hoje) {
        Categoria c = o.getCategoria();
        BigDecimal limite = o.getValorLimite();
        OrcamentoCalculadora.GastoMes doMes = historico != null ? historico.em(mes) : OrcamentoCalculadora.GastoMes.VAZIO;
        BigDecimal gasto = doMes.total();
        List<BigDecimal> anteriores = historico != null
                ? historico.gastosEm(OrcamentoCalculadora.mesesAnteriores(mes, OrcamentoCalculadora.MESES_MEDIA))
                : List.of();
        return new OrcamentoItemResponseDto(
                o.getId(),
                new CategoriaOrcamentoDto(c.getId(), c.getDescricao(), c.getIcone()),
                limite,
                gasto,
                doMes.ateHoje(),
                limite.subtract(gasto),
                OrcamentoCalculadora.percentual(gasto, limite),
                OrcamentoCalculadora.ritmoPercentual(mes, hoje),
                OrcamentoCalculadora.esperadoAteHoje(limite, mes, hoje),
                OrcamentoCalculadora.projecao(gasto, doMes.cartaoAteHoje(), mes, hoje),
                OrcamentoCalculadora.status(gasto, doMes.ateHoje(), limite, mes, hoje),
                OrcamentoCalculadora.sugestaoLimite(anteriores));
    }

    private static LocalDate dataReferencia(YearMonth mes, LocalDate hoje) {
        YearMonth atual = YearMonth.from(hoje);
        if (mes.isAfter(atual)) return null;
        return mes.equals(atual) ? hoje : mes.atEndOfMonth();
    }

    private static BigDecimal somar(List<BigDecimal> valores) {
        return valores.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
