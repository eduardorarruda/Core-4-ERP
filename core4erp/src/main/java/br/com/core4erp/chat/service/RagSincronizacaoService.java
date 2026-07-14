package br.com.core4erp.chat.service;

import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.chat.entity.RagSync;
import br.com.core4erp.chat.repository.RagSyncRepository;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.repository.ContaRepository;
import br.com.core4erp.empresa.repository.EmpresaRepository;
import br.com.core4erp.enums.TipoConta;
import br.com.core4erp.parceiro.entity.Parceiro;
import br.com.core4erp.parceiro.repository.ParceiroRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Vetoriza RESUMOS financeiros mensais agregados por empresa e os grava na mesma coleção Qdrant
 * usada pelo {@link RagService} (metadado {@code empresaId}), dando à IA memória de longo prazo
 * sobre tendências. Números exatos continuam vindo das tools (function-calling) — aqui só entram
 * resumos textuais, nunca linhas cruas do banco (evita staleness, custo e vazamento cross-tenant).
 *
 * <p><b>Fora de requisição HTTP:</b> roda em scheduler, então NUNCA usa {@code TenantContext} —
 * todas as agregações recebem {@code empresaId} como parâmetro explícito.
 */
@Service
public class RagSincronizacaoService {

    private static final Logger log = LoggerFactory.getLogger(RagSincronizacaoService.class);

    static final String TIPO_RESUMO_MENSAL = "RESUMO_MENSAL";
    static final String TIPO_PERFIL_CATEGORIAS = "PERFIL_CATEGORIAS";
    static final String TIPO_PERFIL_PARCEIROS = "PERFIL_PARCEIROS";
    private static final int MESES_BACKFILL = 12;

    private final VectorStore vectorStore;
    private final RagSyncRepository ragSyncRepository;
    private final EmpresaRepository empresaRepository;
    // Agregações recebem empresaId explícito — não dependem do TenantContext (vazio no scheduler).
    private final ContaRepository contaRepository;
    private final CategoriaRepository categoriaRepository;
    private final ParceiroRepository parceiroRepository;

    public RagSincronizacaoService(VectorStore vectorStore,
                                   RagSyncRepository ragSyncRepository,
                                   EmpresaRepository empresaRepository,
                                   ContaRepository contaRepository,
                                   CategoriaRepository categoriaRepository,
                                   ParceiroRepository parceiroRepository) {
        this.vectorStore = vectorStore;
        this.ragSyncRepository = ragSyncRepository;
        this.empresaRepository = empresaRepository;
        this.contaRepository = contaRepository;
        this.categoriaRepository = categoriaRepository;
        this.parceiroRepository = parceiroRepository;
    }

    /** Roda de madrugada; itera empresas ativas (mesmo padrão do SincronizacaoService). */
    @Scheduled(cron = "0 30 3 * * *", zone = "America/Sao_Paulo")
    public void sincronizarTodas() {
        List<Long> empresas = empresaRepository.findIdsAtivas();
        log.info("[RAG-Sync] iniciando sincronização de {} empresa(s)", empresas.size());
        for (Long empresaId : empresas) {
            try {
                sincronizarEmpresa(empresaId);
            } catch (Exception e) {
                log.error("[RAG-Sync] falha empresaId={} — segue para a próxima", empresaId, e);
            }
        }
    }

    /**
     * Re-sincronização manual da empresa atual (endpoint administrativo). Guardada por permissão —
     * o caminho do scheduler ({@link #sincronizarEmpresa}) permanece sem @Requer porque roda sem
     * contexto de segurança. Defesa em profundidade: o controller também exige a permissão.
     */
    @Requer("CONFIGURACAO_EDITAR")
    public int sincronizarEmpresaManual(Long empresaId) {
        return sincronizarEmpresa(empresaId);
    }

    /**
     * Sincroniza os resumos mensais de uma empresa. Na 1ª execução (nenhum RESUMO_MENSAL ainda)
     * faz backfill dos últimos {@value #MESES_BACKFILL} meses; depois, só o mês anterior.
     */
    public int sincronizarEmpresa(Long empresaId) {
        boolean primeiraVez = !ragSyncRepository.existsByEmpresaIdAndTipoResumo(empresaId, TIPO_RESUMO_MENSAL);
        YearMonth mesAnterior = YearMonth.now().minusMonths(1);

        int gravados = 0;
        if (primeiraVez) {
            for (int i = MESES_BACKFILL; i >= 1; i--) {
                if (sincronizarMes(empresaId, YearMonth.now().minusMonths(i))) gravados++;
            }
        } else {
            if (sincronizarMes(empresaId, mesAnterior)) gravados++;
        }
        // Perfis (sem período): catálogo de categorias e parceiros da empresa.
        if (sincronizarPerfilCategorias(empresaId)) gravados++;
        if (sincronizarPerfilParceiros(empresaId)) gravados++;
        return gravados;
    }

    /** @return true se um resumo foi (re)indexado; false se o mês não tinha dados ou nada mudou. */
    @Transactional
    boolean sincronizarMes(Long empresaId, YearMonth mes) {
        String texto = montarResumoMensal(empresaId, mes);
        String periodo = mes.toString(); // 'YYYY-MM'
        return upsert(empresaId, TIPO_RESUMO_MENSAL, periodo,
                "resumo-mensal-%d-%s".formatted(empresaId, periodo), texto);
    }

    /** Perfil de categorias em uso pela empresa (dá à IA o vocabulário de classificação). */
    @Transactional
    boolean sincronizarPerfilCategorias(Long empresaId) {
        List<Categoria> cats = categoriaRepository.findByEmpresaIdAndAtivoTrue(empresaId);
        if (cats.isEmpty()) return false;
        String lista = cats.stream()
                .map(c -> c.getCategoriaPai() != null
                        ? c.getCategoriaPai().getDescricao() + " > " + c.getDescricao()
                        : c.getDescricao())
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .distinct()
                .collect(java.util.stream.Collectors.joining(", "));
        String texto = "Categorias de receita/despesa usadas pela empresa: " + lista + ".";
        return upsert(empresaId, TIPO_PERFIL_CATEGORIAS, null, "perfil-categorias-" + empresaId, texto);
    }

    /** Perfil de parceiros (fornecedores/clientes) da empresa. */
    @Transactional
    boolean sincronizarPerfilParceiros(Long empresaId) {
        List<Parceiro> parceiros = parceiroRepository.findAllByEmpresaId(empresaId);
        if (parceiros.isEmpty()) return false;
        String lista = parceiros.stream()
                .map(this::nomeParceiro)
                .filter(n -> n != null && !n.isBlank())
                .sorted(String.CASE_INSENSITIVE_ORDER)
                .distinct()
                .collect(java.util.stream.Collectors.joining(", "));
        if (lista.isBlank()) return false;
        String texto = "Parceiros (fornecedores/clientes) cadastrados pela empresa: " + lista + ".";
        return upsert(empresaId, TIPO_PERFIL_PARCEIROS, null, "perfil-parceiros-" + empresaId, texto);
    }

    /**
     * Upsert genérico de um documento no vetor + estado em tb_rag_sync. {@code periodo=null} para
     * perfis. Não reindexar quando o hash do conteúdo não mudou (economia de embedding).
     * @return true se (re)indexou; false se vazio ou inalterado.
     */
    @Transactional
    boolean upsert(Long empresaId, String tipo, String periodo, String docId, String texto) {
        if (texto == null || texto.isBlank()) return false;
        String hash = sha256(texto);

        RagSync registro = (periodo == null)
                ? ragSyncRepository.findByEmpresaIdAndTipoResumoAndPeriodoIsNull(empresaId, tipo).orElse(null)
                : ragSyncRepository.findByEmpresaIdAndTipoResumoAndPeriodo(empresaId, tipo, periodo).orElse(null);
        if (registro != null && registro.getHashConteudo().equals(hash)) {
            return false; // conteúdo idêntico → evita re-embedding
        }

        // Upsert manual no vetor: remove o ponto antigo (se houver) e insere o novo.
        vectorStore.delete(List.of(docId));
        vectorStore.add(List.of(new Document(docId, texto, Map.of(
                "empresaId", empresaId.toString(),   // MESMO metadado filtrado por RagService.recuperarContexto
                "tipo", "resumo_financeiro",
                "fonte", docId))));

        if (registro == null) {
            registro = new RagSync();
            registro.setEmpresaId(empresaId);
            registro.setTipoResumo(tipo);
            registro.setPeriodo(periodo);
        }
        registro.setHashConteudo(hash);
        registro.setDocId(docId);
        registro.setSincronizadoEm(LocalDateTime.now());
        ragSyncRepository.save(registro);
        return true;
    }

    private String nomeParceiro(Parceiro p) {
        return p.getNomeFantasia() != null && !p.getNomeFantasia().isBlank()
                ? p.getNomeFantasia() : p.getRazaoSocial();
    }

    /** Texto agregado do mês (vazio se não houve movimento). É ISTO que vira embedding. */
    private String montarResumoMensal(Long empresaId, YearMonth mes) {
        LocalDate inicio = mes.atDay(1);
        LocalDate fim = mes.atEndOfMonth();
        List<Conta> contas = contaRepository.findAllByEmpresaIdAndDataVencimentoBetween(empresaId, inicio, fim);
        if (contas.isEmpty()) return "";

        BigDecimal receitas = BigDecimal.ZERO;
        BigDecimal despesas = BigDecimal.ZERO;
        Map<String, BigDecimal> despesaPorCategoria = new LinkedHashMap<>();

        for (Conta c : contas) {
            if (c.getTipo() == TipoConta.RECEBER) {
                receitas = receitas.add(c.getValorOriginal());
            } else {
                despesas = despesas.add(c.getValorOriginal());
                String cat = categoriaAgrupada(c.getCategoria());
                despesaPorCategoria.merge(cat, c.getValorOriginal(), BigDecimal::add);
            }
        }

        String topCategoria = despesaPorCategoria.entrySet().stream()
                .max(Comparator.comparing(Map.Entry::getValue))
                .map(e -> "%s (%s)".formatted(e.getKey(), brl(e.getValue())))
                .orElse("nenhuma");

        return ("Resumo financeiro de %s — receitas totais %s; despesas totais %s; "
                + "resultado do mês %s; maior categoria de despesa: %s; lançamentos no mês: %d.")
                .formatted(mes, brl(receitas), brl(despesas), brl(receitas.subtract(despesas)),
                        topCategoria, contas.size());
    }

    /** Roll-up: subcategoria soma no total da categoria-pai (consistente com relatórios/dashboard). */
    private String categoriaAgrupada(Categoria c) {
        if (c == null) return "Sem categoria";
        return c.getCategoriaPai() != null ? c.getCategoriaPai().getDescricao() : c.getDescricao();
    }

    private String brl(BigDecimal v) {
        return "R$ " + v.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    private String sha256(String texto) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(md.digest(texto.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            // Fallback improvável (SHA-256 sempre disponível) — usa hashCode para não travar o sync.
            return Integer.toHexString(texto.hashCode());
        }
    }
}
