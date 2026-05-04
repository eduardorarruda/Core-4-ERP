package br.com.core4erp.chat.tools.relatorio;

import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.repository.ContaRepository;
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

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class RelatorioExcelService {

    private final ContaRepository contaRepository;
    private final SecurityContextUtils securityCtx;
    private final Counter totalRelatoriosGerados;
    private final Timer tempoGeracaoRelatorio;

    @Value("${chat.relatorios.dir}")
    private String relatoriosDir;

    @Value("${chat.relatorios.ttl-minutes:60}")
    private int ttlMinutes;

    public RelatorioExcelService(ContaRepository contaRepository,
                                 SecurityContextUtils securityCtx,
                                 MeterRegistry registry) {
        this.contaRepository = contaRepository;
        this.securityCtx = securityCtx;
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

    public String gerarRelatorioDespesas(LocalDate inicio, LocalDate fim) {
        Timer.Sample sample = Timer.start();
        Long uid = securityCtx.getUsuarioId();
        var contas = contaRepository.findAllByUsuarioIdAndDataVencimentoBetween(uid, inicio, fim);

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
                row.createCell(0).setCellValue(conta.getDescricao());
                row.createCell(1).setCellValue(conta.getValorOriginal().doubleValue());
                row.createCell(2).setCellValue(conta.getDataVencimento().toString());
                row.createCell(3).setCellValue(conta.getTipo().name());
                row.createCell(4).setCellValue(conta.getStatus().name());
                row.createCell(5).setCellValue(conta.getCategoria().getDescricao());
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

        totalRelatoriosGerados.increment();
        return fileName;
    }

    public Resource getRelatorio(String email, String fileName) {
        if (fileName.contains("..") || fileName.contains("/") || fileName.contains("\\")) {
            throw new IllegalArgumentException("Nome de arquivo inválido");
        }

        Path filePath = Path.of(relatoriosDir, fileName);
        if (!Files.exists(filePath)) {
            throw new jakarta.persistence.EntityNotFoundException(
                    "Relatório não encontrado ou expirado: " + fileName);
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
