package br.com.core4erp.cartaoCredito.service;

import br.com.core4erp.cartaoCredito.dto.ParcelamentoResponseDto;
import br.com.core4erp.cartaoCredito.dto.ParcelamentoResponseDto.CartaoResumoDto;
import br.com.core4erp.cartaoCredito.dto.ParcelamentoResponseDto.ProximaParcelaDto;
import br.com.core4erp.cartaoCredito.repository.LancamentoCartaoRepository;
import br.com.core4erp.cartaoCredito.repository.ParcelaLinha;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.utils.FaturaHelper;
import br.com.core4erp.utils.MesReferencia;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Compras parceladas em andamento, derivadas de {@code tb_lancamento_cartao}
 * ({@code grupoParcelamento}, {@code numeroParcela}, {@code totalParcelas}) — sem mudança de schema.
 */
@Service
public class ParcelamentoCartaoService {

    private final LancamentoCartaoRepository lancamentoRepo;
    private final TenantContext tenantCtx;
    private final Clock clock;

    @Autowired
    public ParcelamentoCartaoService(LancamentoCartaoRepository lancamentoRepo, TenantContext tenantCtx) {
        this(lancamentoRepo, tenantCtx, Clock.system(MesReferencia.FUSO));
    }

    ParcelamentoCartaoService(LancamentoCartaoRepository lancamentoRepo, TenantContext tenantCtx, Clock clock) {
        this.lancamentoRepo = lancamentoRepo;
        this.tenantCtx = tenantCtx;
        this.clock = clock;
    }

    @Requer("CARTAO_VISUALIZAR")
    @Transactional(readOnly = true)
    public List<ParcelamentoResponseDto> listarAtivos() {
        YearMonth atual = YearMonth.now(clock);
        List<ParcelaLinha> linhas = lancamentoRepo.parcelasDeParcelamentosAtivos(
                tenantCtx.getEmpresaId(), indice(atual));
        return agrupar(linhas, atual);
    }

    /** Agrupa as parcelas por parcelamento; os que terminam antes são listados primeiro. */
    static List<ParcelamentoResponseDto> agrupar(List<ParcelaLinha> linhas, YearMonth atual) {
        Map<String, List<ParcelaLinha>> porGrupo = linhas.stream()
                .collect(Collectors.groupingBy(ParcelaLinha::grupoParcelamento, LinkedHashMap::new, Collectors.toList()));
        return porGrupo.values().stream()
                .map(parcelas -> montar(parcelas, atual))
                .sorted(Comparator.comparing(ParcelamentoResponseDto::terminaEm)
                        .thenComparing(ParcelamentoResponseDto::descricao))
                .toList();
    }

    private static ParcelamentoResponseDto montar(List<ParcelaLinha> parcelas, YearMonth atual) {
        List<ParcelaLinha> ordenadas = parcelas.stream()
                .sorted(Comparator.comparing(ParcelaLinha::numeroParcela)).toList();
        ParcelaLinha primeira = ordenadas.get(0);
        ParcelaLinha ultima = ordenadas.get(ordenadas.size() - 1);

        int parcelaAtual = ordenadas.stream()
                .filter(p -> !fatura(p).isAfter(atual))
                .mapToInt(ParcelaLinha::numeroParcela).max().orElse(0);
        List<ParcelaLinha> futuras = ordenadas.stream().filter(p -> fatura(p).isAfter(atual)).toList();
        int total = primeira.totalParcelas();

        return new ParcelamentoResponseDto(
                primeira.grupoParcelamento(),
                primeira.descricao(),
                primeira.parceiro(),
                new CartaoResumoDto(primeira.cartaoId(), primeira.cartaoNome()),
                primeira.dataCompra(),
                somar(ordenadas),
                primeira.valor(),
                parcelaAtual,
                total,
                Math.max(0, total - parcelaAtual),
                somar(futuras),
                fatura(primeira).toString(),
                fatura(ultima).toString(),
                futuras.stream().map(ParcelamentoCartaoService::proxima).toList());
    }

    private static ProximaParcelaDto proxima(ParcelaLinha p) {
        LocalDate vencimento = p.diaVencimento() != null ? FaturaHelper.dataVencimento(fatura(p), p.diaVencimento()) : null;
        return new ProximaParcelaDto(p.numeroParcela(), fatura(p).toString(), vencimento, p.valor());
    }

    private static YearMonth fatura(ParcelaLinha p) {
        return YearMonth.of(p.anoFatura(), p.mesFatura());
    }

    static int indice(YearMonth ym) {
        return ym.getYear() * 12 + ym.getMonthValue();
    }

    private static BigDecimal somar(List<ParcelaLinha> parcelas) {
        return parcelas.stream().map(ParcelaLinha::valor).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
