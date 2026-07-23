package br.com.core4erp.cartaoCredito.service;

import br.com.core4erp.categoria.dto.CategoriaRequestDto;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.categoria.service.CategoriaService;
import br.com.core4erp.cartaoCredito.dto.ImportarLancamentosResponseDto;
import br.com.core4erp.cartaoCredito.dto.ImportarLancamentosResponseDto.ErroLinha;
import br.com.core4erp.cartaoCredito.dto.LancamentoRequestDto;
import br.com.core4erp.cartaoCredito.enums.TipoLancamentoCartao;
import br.com.core4erp.cartaoCredito.repository.LancamentoCartaoRepository;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.enums.TipoParceiro;
import br.com.core4erp.parceiro.dto.ParceiroRequestDto;
import br.com.core4erp.parceiro.repository.ParceiroRepository;
import br.com.core4erp.parceiro.service.ParceiroService;
import org.apache.poi.ss.usermodel.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Importa lançamentos de cartão a partir de uma planilha (xlsx/xls) com as colunas:
 * Data da Compra, Descrição, Valor, Categoria, CGC PARCEIRO, Número de Parcelas.
 *
 * <p>Reaproveita o motor de criação ({@link CartaoCreditoService#criarLancamento}) — inclusive
 * alocação de fatura e parcelamento — casando/criando Categoria (por nome) e Parceiro (por CNPJ,
 * com enriquecimento BrasilAPI) conforme necessário. Não é {@code @Transactional}: cada linha é
 * processada isoladamente, então uma linha inválida não derruba as demais.</p>
 */
@Service
public class ImportacaoLancamentoCartaoService {

    private static final Logger log = LoggerFactory.getLogger(ImportacaoLancamentoCartaoService.class);
    private static final int MAX_LINHAS = 2000;

    private static final DateTimeFormatter[] DATE_FMTS = {
            DateTimeFormatter.ISO_LOCAL_DATE,                 // 2026-01-07
            DateTimeFormatter.ofPattern("dd/MM/uuuu"),        // 07/01/2026
            DateTimeFormatter.ofPattern("d/M/uuuu"),
            DateTimeFormatter.ofPattern("dd/MM/uu"),
    };

    private final CartaoCreditoService cartaoService;
    private final CategoriaService categoriaService;
    private final ParceiroService parceiroService;
    private final CategoriaRepository categoriaRepo;
    private final ParceiroRepository parceiroRepo;
    private final LancamentoCartaoRepository lancamentoRepo;
    private final TenantContext tenantCtx;

    public ImportacaoLancamentoCartaoService(CartaoCreditoService cartaoService,
                                             CategoriaService categoriaService,
                                             ParceiroService parceiroService,
                                             CategoriaRepository categoriaRepo,
                                             ParceiroRepository parceiroRepo,
                                             LancamentoCartaoRepository lancamentoRepo,
                                             TenantContext tenantCtx) {
        this.cartaoService = cartaoService;
        this.categoriaService = categoriaService;
        this.parceiroService = parceiroService;
        this.categoriaRepo = categoriaRepo;
        this.parceiroRepo = parceiroRepo;
        this.lancamentoRepo = lancamentoRepo;
        this.tenantCtx = tenantCtx;
    }

    @Requer("CARTAO_LANCAR")
    public ImportarLancamentosResponseDto importar(Long cartaoId, MultipartFile arquivo) {
        validarArquivo(arquivo);
        Long empresaId = tenantCtx.getEmpresaId();

        // Caches por import: evita recriar/recasar categoria/parceiro repetidos entre linhas.
        Map<String, Long> cacheCategoria = new HashMap<>();
        Map<String, Long> cacheParceiro = new HashMap<>();

        List<ErroLinha> erros = new ArrayList<>();
        int total = 0, importadas = 0, lancamentos = 0, ignorados = 0;
        int[] criadosCatParc = {0, 0}; // [categoriasCriadas, parceirosCriados]

        try (InputStream in = arquivo.getInputStream();
             Workbook wb = WorkbookFactory.create(in)) {

            Sheet sheet = wb.getNumberOfSheets() > 0 ? wb.getSheetAt(0) : null;
            if (sheet == null) throw new IllegalArgumentException("A planilha está vazia.");
            DataFormatter fmt = new DataFormatter(new Locale("pt", "BR"));

            Row header = sheet.getRow(sheet.getFirstRowNum());
            if (header == null) throw new IllegalArgumentException("A planilha não tem cabeçalho.");
            Map<String, Integer> cols = mapearColunas(header, fmt);

            int cData = col(cols, "datadacompra", "data", "datacompra");
            int cDesc = col(cols, "descricao", "historico", "estabelecimento");
            int cValor = col(cols, "valor");
            int cCat = col(cols, "categoria");
            int cCnpj = col(cols, "cgcparceiro", "cnpj", "cpfcnpj", "cgc", "documento");
            int cParc = col(cols, "numerodeparcelas", "parcelas", "numeroparcelas", "qtdparcelas");

            List<String> faltando = new ArrayList<>();
            if (cData < 0) faltando.add("Data da Compra");
            if (cDesc < 0) faltando.add("Descrição");
            if (cValor < 0) faltando.add("Valor");
            if (cCat < 0) faltando.add("Categoria");
            if (cCnpj < 0) faltando.add("CGC PARCEIRO");
            if (!faltando.isEmpty()) {
                throw new IllegalArgumentException("A planilha está sem a(s) coluna(s): "
                        + String.join(", ", faltando) + ". Verifique o cabeçalho.");
            }

            int primeira = sheet.getFirstRowNum() + 1;
            int ultima = sheet.getLastRowNum();
            for (int r = primeira; r <= ultima; r++) {
                Row row = sheet.getRow(r);
                if (row == null || linhaVazia(row, fmt)) continue;
                int numLinha = r + 1; // 1-based como o usuário vê no Excel
                total++;
                if (total > MAX_LINHAS) {
                    erros.add(new ErroLinha(numLinha, "Limite de " + MAX_LINHAS
                            + " linhas por importação — divida a planilha e reenvie o restante."));
                    break;
                }
                try {
                    String descricao = str(row, cDesc, fmt);
                    if (descricao.isBlank()) throw new IllegalArgumentException("descrição vazia.");
                    BigDecimal valor = parseValor(row, cValor, fmt);
                    if (valor == null || valor.signum() <= 0)
                        throw new IllegalArgumentException("valor inválido ou vazio.");
                    LocalDate data = parseData(row, cData, fmt);
                    if (data == null)
                        throw new IllegalArgumentException("data da compra inválida ou vazia.");
                    String catNome = str(row, cCat, fmt);
                    if (catNome.isBlank()) throw new IllegalArgumentException("categoria vazia.");
                    String cnpj = soDigitos(str(row, cCnpj, fmt));
                    if (cnpj.isBlank())
                        throw new IllegalArgumentException("CGC/CNPJ do parceiro vazio.");
                    int parcelas = parseParcelas(row, cParc, fmt);

                    Long categoriaId = resolverCategoria(catNome, empresaId, cacheCategoria, criadosCatParc);
                    Long parceiroId = resolverParceiro(cnpj, descricao, empresaId, cacheParceiro, criadosCatParc);

                    // Dedupe: se a 1ª parcela dessa compra já existe no cartão, pula (re-import).
                    if (lancamentoRepo.existsByCartaoCreditoIdAndEmpresaIdAndDataCompraAndDescricaoAndNumeroParcela(
                            cartaoId, empresaId, data, descricao, 1)) {
                        ignorados++;
                        continue;
                    }

                    LancamentoRequestDto dto = new LancamentoRequestDto(
                            descricao, valor, data, categoriaId, parceiroId,
                            parcelas, /* dividirValor */ true, TipoLancamentoCartao.SAIDA);
                    lancamentos += cartaoService.criarLancamento(cartaoId, dto).size();
                    importadas++;
                } catch (Exception e) {
                    erros.add(new ErroLinha(numLinha, mensagemAmigavel(e)));
                }
            }
        } catch (IllegalArgumentException e) {
            throw e; // erros de formato/cabeçalho sobem como 400
        } catch (Exception e) {
            log.warn("[IMPORT-CARTAO] falha ao ler planilha: {}", e.getMessage());
            throw new IllegalArgumentException("Não consegui ler a planilha. Confira se é um arquivo .xlsx válido.");
        }

        return new ImportarLancamentosResponseDto(
                total, importadas, lancamentos, criadosCatParc[0], criadosCatParc[1], ignorados, erros);
    }

    // ── Resolução de categoria/parceiro ───────────────────────────────────────

    private Long resolverCategoria(String nome, Long empresaId, Map<String, Long> cache, int[] criados) {
        String chave = nome.strip().toLowerCase();
        Long id = cache.get(chave);
        if (id != null) return id;
        id = categoriaRepo.findFirstByEmpresaIdAndDescricaoIgnoreCaseAndAtivoTrue(empresaId, nome.strip())
                .map(c -> c.getId())
                .orElse(null);
        if (id == null) {
            id = categoriaService.criar(new CategoriaRequestDto(nome.strip(), null, null)).id();
            criados[0]++;
        }
        cache.put(chave, id);
        return id;
    }

    private Long resolverParceiro(String cnpj, String descricaoLinha, Long empresaId,
                                  Map<String, Long> cache, int[] criados) {
        Long id = cache.get(cnpj);
        if (id != null) return id;
        id = parceiroRepo.findFirstByCpfCnpjAndEmpresaId(cnpj, empresaId)
                .map(p -> p.getId())
                .orElse(null);
        if (id == null) {
            // Razão social = descrição do lançamento (em extratos costuma ser o nome do
            // estabelecimento). O próprio ParceiroService.criar enriquece nomeFantasia/endereço via
            // BrasilAPI — chamamos a Receita UMA vez só (lá dentro), para o import não estourar o
            // timeout num extrato grande com muitos parceiros novos.
            String razaoSocial = descricaoLinha.isBlank() ? ("Parceiro " + cnpj) : descricaoLinha.strip();
            if (razaoSocial.length() > 150) razaoSocial = razaoSocial.substring(0, 150);
            ParceiroRequestDto dto = new ParceiroRequestDto(
                    razaoSocial, null, cnpj, TipoParceiro.FORNECEDOR,
                    null, null, null, null, null, null, null, null, null);
            id = parceiroService.criar(dto).id();
            criados[1]++;
        }
        cache.put(cnpj, id);
        return id;
    }

    // ── Parsing de células ────────────────────────────────────────────────────

    private Map<String, Integer> mapearColunas(Row header, DataFormatter fmt) {
        Map<String, Integer> map = new HashMap<>();
        for (Cell c : header) {
            String chave = norm(fmt.formatCellValue(c));
            if (!chave.isBlank()) map.putIfAbsent(chave, c.getColumnIndex());
        }
        return map;
    }

    private int col(Map<String, Integer> map, String... aliases) {
        for (String a : aliases) {
            Integer i = map.get(a);
            if (i != null) return i;
        }
        return -1;
    }

    private String norm(String s) {
        if (s == null) return "";
        String n = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return n.toLowerCase().replaceAll("[^a-z0-9]", "");
    }

    private boolean linhaVazia(Row row, DataFormatter fmt) {
        for (Cell c : row) {
            if (!fmt.formatCellValue(c).strip().isBlank()) return false;
        }
        return true;
    }

    private String str(Row row, int idx, DataFormatter fmt) {
        if (idx < 0) return "";
        Cell c = row.getCell(idx);
        return c == null ? "" : fmt.formatCellValue(c).strip();
    }

    private BigDecimal parseValor(Row row, int idx, DataFormatter fmt) {
        if (idx < 0) return null;
        Cell c = row.getCell(idx);
        if (c == null) return null;
        if (c.getCellType() == CellType.NUMERIC && !DateUtil.isCellDateFormatted(c)) {
            return BigDecimal.valueOf(c.getNumericCellValue()).setScale(2, RoundingMode.HALF_UP);
        }
        String s = fmt.formatCellValue(c).strip().replaceAll("[^0-9,.-]", "");
        if (s.isBlank()) return null;
        if (s.contains(",")) s = s.replace(".", "").replace(",", "."); // vírgula = decimal pt-BR
        try {
            return new BigDecimal(s).setScale(2, RoundingMode.HALF_UP);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private LocalDate parseData(Row row, int idx, DataFormatter fmt) {
        if (idx < 0) return null;
        Cell c = row.getCell(idx);
        if (c == null) return null;
        if (c.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(c)) {
            return c.getLocalDateTimeCellValue().toLocalDate();
        }
        String s = fmt.formatCellValue(c).strip();
        if (s.isBlank()) return null;
        for (DateTimeFormatter f : DATE_FMTS) {
            try {
                return LocalDate.parse(s, f);
            } catch (DateTimeParseException ignored) {
                // tenta o próximo formato
            }
        }
        return null;
    }

    private int parseParcelas(Row row, int idx, DataFormatter fmt) {
        String s = norm(str(row, idx, fmt)); // remove acentos: "não" -> "nao"
        if (s.isBlank() || s.contains("nao") || s.contains("sem") || s.contains("avista")) return 1;
        String digits = s.replaceAll("[^0-9]", "");
        if (digits.isBlank()) return 1;
        try {
            int n = Integer.parseInt(digits);
            return n >= 1 ? Math.min(n, 72) : 1;
        } catch (NumberFormatException e) {
            return 1;
        }
    }

    private String soDigitos(String s) {
        return s == null ? "" : s.replaceAll("[^0-9]", "");
    }

    private void validarArquivo(MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty()) {
            throw new IllegalArgumentException("Envie uma planilha (.xlsx).");
        }
        String nome = arquivo.getOriginalFilename();
        if (nome == null || !(nome.toLowerCase().endsWith(".xlsx") || nome.toLowerCase().endsWith(".xls"))) {
            throw new IllegalArgumentException("Formato inválido. Envie uma planilha .xlsx ou .xls.");
        }
    }

    private String mensagemAmigavel(Exception e) {
        String m = e.getMessage();
        if (m == null || m.isBlank()) return "não foi possível processar esta linha.";
        return m;
    }
}
