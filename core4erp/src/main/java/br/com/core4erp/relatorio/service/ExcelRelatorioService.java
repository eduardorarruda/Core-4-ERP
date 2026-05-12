package br.com.core4erp.relatorio.service;

import br.com.core4erp.relatorio.dto.RelatorioResponseDto;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

@Service
public class ExcelRelatorioService {

    public Resource gerar(RelatorioResponseDto dados, String titulo, LocalDate inicio, LocalDate fim) {
        try (Workbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Relatório");

            CellStyle headerStyle = wb.createCellStyle();
            Font hFont = wb.createFont();
            hFont.setBold(true);
            headerStyle.setFont(hFont);

            CellStyle titleStyle = wb.createCellStyle();
            Font tFont = wb.createFont();
            tFont.setBold(true);
            tFont.setFontHeightInPoints((short) 13);
            titleStyle.setFont(tFont);

            int row = 0;
            Row titleRow = sheet.createRow(row++);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(inicio != null ? titulo + " — " + inicio + " a " + fim : titulo);
            titleCell.setCellStyle(titleStyle);
            row++;

            Row headerRow = sheet.createRow(row++);
            List<String> cab = dados.cabecalho();
            for (int i = 0; i < cab.size(); i++) {
                Cell c = headerRow.createCell(i);
                c.setCellValue(cab.get(i));
                c.setCellStyle(headerStyle);
            }

            for (List<Object> linha : dados.linhas()) {
                Row dataRow = sheet.createRow(row++);
                for (int i = 0; i < linha.size(); i++) {
                    Object val = linha.get(i);
                    Cell c = dataRow.createCell(i);
                    if (val instanceof Number n) c.setCellValue(n.doubleValue());
                    else c.setCellValue(String.valueOf(val));
                }
            }

            if (dados.totais() != null && !dados.totais().isEmpty()) {
                Row totRow = sheet.createRow(row);
                for (int i = 0; i < dados.totais().size(); i++) {
                    Object val = dados.totais().get(i);
                    Cell c = totRow.createCell(i);
                    c.setCellStyle(headerStyle);
                    if (val instanceof Number n) c.setCellValue(n.doubleValue());
                    else c.setCellValue(String.valueOf(val));
                }
            }

            for (int i = 0; i < cab.size(); i++) sheet.autoSizeColumn(i);

            wb.write(out);
            return new ByteArrayResource(out.toByteArray());
        } catch (IOException e) {
            throw new RuntimeException("Erro ao gerar Excel", e);
        }
    }
}
