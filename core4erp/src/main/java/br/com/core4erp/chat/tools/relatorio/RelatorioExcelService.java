package br.com.core4erp.chat.tools.relatorio;

import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.repository.ContaRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PostConstruct;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Service
public class RelatorioExcelService {

    /** Dono do arquivo gerado: só ele (na mesma empresa) pode baixar. */
    record DonoRelatorio(Long usuarioId, Long empresaId) {}

    private static final Pattern NOME_ARQUIVO = Pattern.compile(
            "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.xlsx$");
    private static final String MSG_NAO_ENCONTRADO = "Relatório não encontrado ou expirado. Gere o relatório novamente.";

    /**
     * Índice arquivo → dono, com a MESMA validade do arquivo (chat.relatorios.ttl-minutes): depois
     * disso o download responde 404 mesmo que a limpeza horária ainda não tenha apagado o arquivo.
     * Em memória: após reiniciar, relatórios antigos deixam de ser baixáveis (basta gerar de novo).
     */
    private final Cache<String, DonoRelatorio> donos;

    private final ContaRepository contaRepository;
    private final SecurityContextUtils securityCtx;
    private final TenantContext tenantCtx;
    private final Counter totalRelatoriosGerados;
    private final Timer tempoGeracaoRelatorio;

    @Value("${chat.relatorios.dir}")
    private String relatoriosDir;

    private final int ttlMinutes;

    public RelatorioExcelService(ContaRepository contaRepository,
                                 SecurityContextUtils securityCtx,
                                 TenantContext tenantCtx,
                                 MeterRegistry registry,
                                 @Value("${chat.relatorios.ttl-minutes:60}") int ttlMinutes) {
        this.ttlMinutes = ttlMinutes;
        this.donos = Caffeine.newBuilder()
                .expireAfterWrite(ttlMinutes, TimeUnit.MINUTES)
                .maximumSize(10_000)
                .build();
        this.contaRepository = contaRepository;
        this.securityCtx = securityCtx;
        this.tenantCtx = tenantCtx;
        this.totalRelatoriosGerados = Counter.builder("erp.relatorio.gerado")
                .description("Total de relatórios Excel gerados")
                .tag("tipo", "despesas")
                .register(registry);
        this.tempoGeracaoRelatorio = Timer.builder("erp.relatorio.geracao.duracao")
                .description("Tempo de geração do relatório Excel")
                .publishPercentiles(0.5, 0.95)
                .register(registry);
    }

    @PostConstruct
    public void init() throws IOException {
        Files.createDirectories(Path.of(relatoriosDir));
    }

    /**
     * Mantém a sessão Hibernate aberta durante toda a geração para que as associações lazy
     * (ex.: {@code conta.getCategoria()}) sejam carregadas mesmo quando executado fora do
     * dispatch HTTP — caso do chat por streaming, que roda numa thread de pool sem OSIV.
     */
    @Requer("CONTA_VISUALIZAR") // o relatório expõe as contas a pagar/receber da empresa
    @Transactional(readOnly = true)
    public String gerarRelatorioDespesas(LocalDate inicio, LocalDate fim) {
        Timer.Sample sample = Timer.start();
        Long empresaId = tenantCtx.getEmpresaId();
        Long usuarioId = tenantCtx.getUsuarioId();
        if (empresaId == null || usuarioId == null) {
            throw new IllegalStateException("Não foi possível identificar a empresa para gerar o relatório.");
        }
        var contas = contaRepository.findAllByEmpresaIdAndDataVencimentoBetween(empresaId, inicio, fim);

        String fileName = UUID.randomUUID() + ".xlsx";
        Path filePath = Path.of(relatoriosDir, fileName);

        try (Workbook wb = new XSSFWorkbook();
             FileOutputStream out = new FileOutputStream(filePath.toFile())) {

            Sheet sheet = wb.createSheet("Relatório");

            Row header = sheet.createRow(0);
            CellStyle headerStyle = wb.createCellStyle();
            Font headerFont = wb.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            String[] colunas = {"Descrição", "Valor (R$)", "Vencimento",
                                "Tipo", "Status", "Categoria", "Parcela"};
            for (int i = 0; i < colunas.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(colunas[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (Conta conta : contas) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(sanitizarCelula(conta.getDescricao()));
                row.createCell(1).setCellValue(conta.getValorOriginal().doubleValue());
                row.createCell(2).setCellValue(conta.getDataVencimento().toString());
                row.createCell(3).setCellValue(conta.getTipo().name());
                row.createCell(4).setCellValue(conta.getStatus().name());
                row.createCell(5).setCellValue(sanitizarCelula(
                        conta.getCategoria() != null ? conta.getCategoria().getDescricao() : ""));
                row.createCell(6).setCellValue(
                        conta.getNumeroParcela() + "/" + conta.getTotalParcelas());
            }

            for (int i = 0; i < colunas.length; i++) {
                sheet.autoSizeColumn(i);
            }

            wb.write(out);
        } catch (IOException e) {
            throw new RuntimeException("Erro ao gerar relatório Excel", e);
        } finally {
            sample.stop(tempoGeracaoRelatorio);
        }

        donos.put(fileName, new DonoRelatorio(usuarioId, empresaId));
        totalRelatoriosGerados.increment();
        return fileName;
    }

    /**
     * Defesa contra CSV/Formula injection: texto vindo do usuário que comece com
     * {@code = + - @ TAB CR} seria interpretado como fórmula pelo Excel/LibreOffice — prefixa {@code '}.
     */
    static String sanitizarCelula(String valor) {
        if (valor == null || valor.isEmpty()) return valor == null ? "" : valor;
        char c = valor.charAt(0);
        return (c == '=' || c == '+' || c == '-' || c == '@' || c == '\t' || c == '\r') ? "'" + valor : valor;
    }

    /**
     * Download: só o usuário que gerou, na mesma empresa, enquanto o relatório não expirou.
     * Qualquer outro caso responde 404 (sem revelar se o arquivo existe).
     */
    public Resource getRelatorio(Long usuarioId, Long empresaId, String fileName) {
        if (fileName == null || !NOME_ARQUIVO.matcher(fileName).matches()) {
            throw new jakarta.persistence.EntityNotFoundException(MSG_NAO_ENCONTRADO);
        }
        DonoRelatorio dono = donos.getIfPresent(fileName);
        if (dono == null || !Objects.equals(dono.usuarioId(), usuarioId)
                || !Objects.equals(dono.empresaId(), empresaId)) {
            throw new jakarta.persistence.EntityNotFoundException(MSG_NAO_ENCONTRADO);
        }

        Path filePath = Path.of(relatoriosDir, fileName);
        if (!Files.exists(filePath)) {
            throw new jakarta.persistence.EntityNotFoundException(MSG_NAO_ENCONTRADO);
        }
        return new FileSystemResource(filePath);
    }

    @Scheduled(fixedRate = 3600000)
    public void limparRelatoriosExpirados() {
        try {
            LocalDateTime limite = LocalDateTime.now().minusMinutes(ttlMinutes);
            Files.list(Path.of(relatoriosDir))
                    .filter(p -> {
                        try {
                            return Files.getLastModifiedTime(p).toInstant()
                                    .isBefore(limite.atZone(java.time.ZoneId.systemDefault()).toInstant());
                        } catch (IOException e) {
                            return false;
                        }
                    })
                    .forEach(p -> {
                        try {
                            Files.delete(p);
                        } catch (IOException ignored) {}
                    });
        } catch (IOException ignored) {}
    }
}
