package br.com.core4erp.chat.tools.relatorio;

import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.repository.ContaRepository;
import br.com.core4erp.enums.TipoConta;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import jakarta.persistence.EntityNotFoundException;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.InputStream;
import java.math.BigDecimal;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class RelatorioExcelServiceTest {

    @TempDir
    Path dir;

    private final ContaRepository contaRepo = mock(ContaRepository.class);
    private final TenantContext ctx = new TenantContext();
    private RelatorioExcelService service;

    @BeforeEach
    void setUp() {
        service = new RelatorioExcelService(contaRepo, mock(SecurityContextUtils.class), ctx,
                new SimpleMeterRegistry(), 60);
        ReflectionTestUtils.setField(service, "relatoriosDir", dir.toString());
        ctx.setUsuarioId(1L);
        ctx.setEmpresaId(10L);

        Categoria cat = new Categoria();
        cat.setDescricao("@SUM(1+1)*cmd|' /C calc'!A0");
        Conta c = new Conta();
        c.setDescricao("=HYPERLINK(\"http://evil\",\"x\")");
        c.setValorOriginal(new BigDecimal("10.00"));
        c.setDataVencimento(LocalDate.of(2026, 1, 1));
        c.setTipo(TipoConta.PAGAR);
        c.setCategoria(cat);
        when(contaRepo.findAllByEmpresaIdAndDataVencimentoBetween(eq(10L), any(), any())).thenReturn(List.of(c));
    }

    @AfterEach
    void limpar() {
        ctx.clear();
    }

    @Test
    void dono_consegueBaixar() throws Exception {
        String arquivo = service.gerarRelatorioDespesas(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));
        assertThat(service.getRelatorio(1L, 10L, arquivo).exists()).isTrue();
    }

    @Test
    void outroUsuarioOuOutraEmpresa_recebe404() {
        String arquivo = service.gerarRelatorioDespesas(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));
        assertThatThrownBy(() -> service.getRelatorio(2L, 10L, arquivo)).isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> service.getRelatorio(1L, 99L, arquivo)).isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void nomeForaDoPadrao_ouTraversal_recebe404() {
        assertThatThrownBy(() -> service.getRelatorio(1L, 10L, "../../etc/passwd"))
                .isInstanceOf(EntityNotFoundException.class);
        assertThatThrownBy(() -> service.getRelatorio(1L, 10L, "relatorio.xlsx"))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void celulasComFormula_saoNeutralizadas() throws Exception {
        String arquivo = service.gerarRelatorioDespesas(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 1, 31));
        try (InputStream in = service.getRelatorio(1L, 10L, arquivo).getInputStream();
             Workbook wb = new XSSFWorkbook(in)) {
            var linha = wb.getSheetAt(0).getRow(1);
            assertThat(linha.getCell(0).getStringCellValue()).startsWith("'=");
            assertThat(linha.getCell(5).getStringCellValue()).startsWith("'@");
        }
    }

    @Test
    void sanitizarCelula_cobreTodosOsPrefixos() {
        for (String p : List.of("=", "+", "-", "@", "\t", "\r")) {
            assertThat(RelatorioExcelService.sanitizarCelula(p + "x")).isEqualTo("'" + p + "x");
        }
        assertThat(RelatorioExcelService.sanitizarCelula("Mercado")).isEqualTo("Mercado");
        assertThat(RelatorioExcelService.sanitizarCelula(null)).isEmpty();
    }
}
