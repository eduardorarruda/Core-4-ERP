package br.com.core4erp.orcamento.service;

import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.categoria.repository.CategoriaRepository;
import br.com.core4erp.config.rbac.Requer;
import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.orcamento.controller.OrcamentoController;
import br.com.core4erp.orcamento.dto.OrcamentoItemResponseDto;
import br.com.core4erp.orcamento.dto.OrcamentoMesResponseDto;
import br.com.core4erp.orcamento.dto.OrcamentoRequestDto;
import br.com.core4erp.orcamento.dto.SugestaoOrcamentoResponseDto;
import br.com.core4erp.orcamento.entity.Orcamento;
import br.com.core4erp.orcamento.enums.StatusOrcamento;
import br.com.core4erp.orcamento.repository.GastoRepository;
import br.com.core4erp.orcamento.repository.GastoRepository.GastoCategoriaMes;
import br.com.core4erp.orcamento.repository.OrcamentoRepository;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OrcamentoServiceTest {

    private static final long EMPRESA = 10L;
    private static final LocalDate HOJE = LocalDate.of(2026, 10, 15);
    private static final YearMonth OUTUBRO = YearMonth.of(2026, 10);

    private final OrcamentoRepository orcamentoRepo = mock(OrcamentoRepository.class);
    private final GastoRepository gastoRepo = mock(GastoRepository.class);
    private final CategoriaRepository categoriaRepo = mock(CategoriaRepository.class);
    private final SecurityContextUtils securityCtx = mock(SecurityContextUtils.class);
    private final TenantContext ctx = new TenantContext();
    private final Clock clock = Clock.fixed(HOJE.atTime(12, 0).toInstant(ZoneOffset.UTC), ZoneOffset.UTC);
    private final OrcamentoService service =
            new OrcamentoService(orcamentoRepo, gastoRepo, categoriaRepo, ctx, securityCtx, clock);

    @BeforeEach
    void contexto() {
        ctx.setUsuarioId(1L);
        ctx.setEmpresaId(EMPRESA);
        when(securityCtx.getUsuario()).thenReturn(new Usuario());
        when(orcamentoRepo.save(any())).thenAnswer(inv -> {
            Orcamento o = inv.getArgument(0);
            if (o.getId() == null) o.setId(99L);
            return o;
        });
        when(gastoRepo.gastoMensalPorCategoria(anyLong(), any(), any(), any())).thenReturn(List.of());
    }

    @AfterEach
    void limpar() {
        ctx.clear();
    }

    private static Categoria categoria(long id, String descricao, Categoria pai) {
        Categoria c = new Categoria();
        c.setId(id);
        c.setDescricao(descricao);
        c.setIcone("Tag");
        c.setCategoriaPai(pai);
        c.setEmpresaId(EMPRESA);
        return c;
    }

    private static Orcamento orcamento(long id, Categoria c, String limite) {
        Orcamento o = new Orcamento();
        o.setId(id);
        o.setCategoria(c);
        o.setValorLimite(new BigDecimal(limite));
        o.setEmpresaId(EMPRESA);
        return o;
    }

    /** Gasto já realizado (todo com data até hoje). */
    private static GastoCategoriaMes gasto(long cat, String desc, YearMonth m, String valor) {
        BigDecimal v = new BigDecimal(valor);
        return new GastoCategoriaMes(cat, desc, "Tag", m.getYear(), m.getMonthValue(), v, v, BigDecimal.ZERO);
    }

    // ── Isolamento de tenant ─────────────────────────────────────────────────

    @Test
    void criar_categoriaDeOutraEmpresa_404_semGravar() {
        when(categoriaRepo.findByIdAndEmpresaId(555L, EMPRESA)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.criar(new OrcamentoRequestDto(555L, new BigDecimal("500"))))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Categoria não encontrada");
        verify(categoriaRepo).findByIdAndEmpresaId(555L, EMPRESA);
        verify(orcamentoRepo, never()).save(any());
    }

    @Test
    void atualizar_orcamentoDeOutraEmpresa_404() {
        when(orcamentoRepo.findAtivoByIdAndEmpresaId(7L, EMPRESA)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.atualizar(7L, new OrcamentoRequestDto(1L, BigDecimal.TEN)))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("Orçamento não encontrado");
        verify(orcamentoRepo, never()).save(any());
    }

    @Test
    void atualizar_paraCategoriaDeOutraEmpresa_404() {
        Categoria minha = categoria(1L, "Mercado", null);
        when(orcamentoRepo.findAtivoByIdAndEmpresaId(7L, EMPRESA)).thenReturn(Optional.of(orcamento(7L, minha, "300")));
        when(categoriaRepo.findByIdAndEmpresaId(555L, EMPRESA)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.atualizar(7L, new OrcamentoRequestDto(555L, BigDecimal.TEN)))
                .isInstanceOf(EntityNotFoundException.class);
        verify(orcamentoRepo, never()).save(any());
    }

    @Test
    void deletar_deOutraEmpresa_404_eDaPropria_inativa() {
        when(orcamentoRepo.findAtivoByIdAndEmpresaId(8L, EMPRESA)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.deletar(8L)).isInstanceOf(EntityNotFoundException.class);

        Orcamento o = orcamento(9L, categoria(1L, "Mercado", null), "300");
        when(orcamentoRepo.findAtivoByIdAndEmpresaId(9L, EMPRESA)).thenReturn(Optional.of(o));
        service.deletar(9L);
        assertThat(o.getAtivo()).isFalse();
        verify(orcamentoRepo).save(o);
    }

    @Test
    void listar_consultaGastoSempreComEmpresaDoContexto() {
        when(orcamentoRepo.findAtivosComCategoria(EMPRESA)).thenReturn(List.of());

        service.listar(OUTUBRO);

        verify(orcamentoRepo).findAtivosComCategoria(EMPRESA);
        verify(gastoRepo).gastoMensalPorCategoria(EMPRESA, LocalDate.of(2026, 7, 1), LocalDate.of(2026, 10, 31), HOJE);
    }

    // ── Regras de validação ──────────────────────────────────────────────────

    @Test
    void criar_subcategoria_rejeitada() {
        Categoria pai = categoria(1L, "Casa", null);
        when(categoriaRepo.findByIdAndEmpresaId(2L, EMPRESA)).thenReturn(Optional.of(categoria(2L, "Luz", pai)));

        assertThatThrownBy(() -> service.criar(new OrcamentoRequestDto(2L, new BigDecimal("100"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("categoria principal");
    }

    @Test
    void criar_categoriaInativa_rejeitada() {
        Categoria c = categoria(3L, "Antiga", null);
        c.setAtivo(false);
        when(categoriaRepo.findByIdAndEmpresaId(3L, EMPRESA)).thenReturn(Optional.of(c));

        assertThatThrownBy(() -> service.criar(new OrcamentoRequestDto(3L, new BigDecimal("100"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("inativa");
    }

    @Test
    void criar_duplicado_conflito() {
        when(categoriaRepo.findByIdAndEmpresaId(1L, EMPRESA)).thenReturn(Optional.of(categoria(1L, "Mercado", null)));
        when(orcamentoRepo.existsByEmpresaIdAndCategoria_IdAndAtivoTrue(EMPRESA, 1L)).thenReturn(true);

        assertThatThrownBy(() -> service.criar(new OrcamentoRequestDto(1L, new BigDecimal("100"))))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("ORCAMENTO_JA_EXISTE");
        verify(orcamentoRepo, never()).save(any());
    }

    @Test
    void criar_ok_devolveItemDoMesAtualComGasto() {
        Categoria mercado = categoria(1L, "Mercado", null);
        when(categoriaRepo.findByIdAndEmpresaId(1L, EMPRESA)).thenReturn(Optional.of(mercado));
        when(gastoRepo.gastoMensalPorCategoria(eq(EMPRESA), any(), any(), any()))
                .thenReturn(List.of(gasto(1L, "Mercado", OUTUBRO, "320.00")));

        OrcamentoItemResponseDto item = service.criar(new OrcamentoRequestDto(1L, new BigDecimal("600.00")));

        assertThat(item.id()).isEqualTo(99L);
        assertThat(item.gasto()).isEqualByComparingTo("320.00");
        assertThat(item.restante()).isEqualByComparingTo("280.00");
        assertThat(item.status()).isEqualTo(StatusOrcamento.ATENCAO); // 320 > 290.32 esperado no dia 15
    }

    // ── Montagem do mês ──────────────────────────────────────────────────────

    @Test
    void listar_calculaItensTotaisEGastoSemOrcamento() {
        Categoria mercado = categoria(1L, "Mercado", null);
        Categoria lazer = categoria(2L, "Lazer", null);
        when(orcamentoRepo.findAtivosComCategoria(EMPRESA)).thenReturn(List.of(
                orcamento(11L, mercado, "600.00"), orcamento(12L, lazer, "200.00")));
        when(gastoRepo.gastoMensalPorCategoria(eq(EMPRESA), any(), any(), any())).thenReturn(List.of(
                gasto(1L, "Mercado", OUTUBRO, "250.00"),
                gasto(1L, "Mercado", OUTUBRO.minusMonths(1), "500.00"),
                gasto(1L, "Mercado", OUTUBRO.minusMonths(2), "550.00"),
                gasto(1L, "Mercado", OUTUBRO.minusMonths(3), "610.00"),
                gasto(2L, "Lazer", OUTUBRO, "260.00"),
                gasto(3L, "Transporte", OUTUBRO, "90.00")));

        OrcamentoMesResponseDto mes = service.listar(OUTUBRO);

        Map<Long, OrcamentoItemResponseDto> porCat = mes.itens().stream()
                .collect(Collectors.toMap(i -> i.categoria().id(), Function.identity()));
        assertThat(mes.itens().get(0).categoria().id()).isEqualTo(2L); // maior % primeiro (130%)
        assertThat(porCat.get(2L).status()).isEqualTo(StatusOrcamento.ESTOURADO);
        assertThat(porCat.get(1L).status()).isEqualTo(StatusOrcamento.OK);
        assertThat(porCat.get(1L).sugestaoLimite()).isEqualByComparingTo("560.00"); // média 553.33
        assertThat(porCat.get(2L).sugestaoLimite()).isNull();                      // sem histórico
        assertThat(mes.totalLimite()).isEqualByComparingTo("800.00");
        assertThat(mes.totalGasto()).isEqualByComparingTo("510.00");
        assertThat(mes.gastoSemOrcamento()).isEqualByComparingTo("90.00");
        assertThat(mes.ritmo()).isEqualByComparingTo("48.39");
        assertThat(mes.dataReferencia()).isEqualTo(HOJE);
        assertThat(mes.mes()).isEqualTo("2026-10");
    }

    @Test
    void sugestoes_soCategoriasRaizAtivasSemOrcamento() {
        Categoria mercado = categoria(1L, "Mercado", null);
        Categoria transporte = categoria(3L, "Transporte", null);
        when(orcamentoRepo.findAtivosComCategoria(EMPRESA)).thenReturn(List.of(orcamento(11L, mercado, "600.00")));
        when(categoriaRepo.findByEmpresaIdAndAtivoTrue(EMPRESA)).thenReturn(List.of(mercado, transporte));
        when(gastoRepo.gastoMensalPorCategoria(eq(EMPRESA), any(), any(), any())).thenReturn(List.of(
                gasto(1L, "Mercado", OUTUBRO, "250.00"),
                gasto(3L, "Transporte", OUTUBRO.minusMonths(1), "301.00"),
                gasto(4L, "Inativa", OUTUBRO, "999.00")));

        List<SugestaoOrcamentoResponseDto> sugestoes = service.sugestoes(OUTUBRO);

        assertThat(sugestoes).singleElement().satisfies(s -> {
            assertThat(s.categoria().id()).isEqualTo(3L);
            assertThat(s.mediaUltimos3Meses()).isEqualByComparingTo("100.33");
            assertThat(s.sugestaoLimite()).isEqualByComparingTo("110.00");
        });
    }

    @Test
    void listar_contaAgendadaParaDepoisDeHoje_naoDisparaAtencao() {
        Categoria casa = categoria(1L, "Casa", null);
        when(orcamentoRepo.findAtivosComCategoria(EMPRESA)).thenReturn(List.of(orcamento(11L, casa, "2000.00")));
        when(gastoRepo.gastoMensalPorCategoria(eq(EMPRESA), any(), any(), any())).thenReturn(List.of(
                new GastoCategoriaMes(1L, "Casa", "Home", 2026, 10,
                        new BigDecimal("1800.00"), BigDecimal.ZERO, BigDecimal.ZERO)));

        OrcamentoItemResponseDto item = service.listar(OUTUBRO).itens().get(0);

        assertThat(item.gasto()).isEqualByComparingTo("1800.00");
        assertThat(item.gastoAteHoje()).isEqualByComparingTo("0");
        assertThat(item.status()).isEqualTo(StatusOrcamento.OK);
        assertThat(item.projecao()).isEqualByComparingTo("1800.00");
    }

    @Test
    void mesInvalido_rejeitado() {
        assertThatThrownBy(() -> service.listar(YearMonth.of(1900, 1)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    // ── RBAC: @Requer no controller E no service (defense-in-depth) ─────────

    @Test
    void requer_emTodosOsMetodosPublicos_doServiceEControler() {
        assertRequer(OrcamentoService.class, Map.of(
                "listar", "ORCAMENTO_VISUALIZAR", "sugestoes", "ORCAMENTO_VISUALIZAR",
                "criar", "ORCAMENTO_EDITAR", "atualizar", "ORCAMENTO_EDITAR", "deletar", "ORCAMENTO_EDITAR"));
        assertRequer(OrcamentoController.class, Map.of(
                "listar", "ORCAMENTO_VISUALIZAR", "sugestoes", "ORCAMENTO_VISUALIZAR",
                "criar", "ORCAMENTO_EDITAR", "atualizar", "ORCAMENTO_EDITAR", "deletar", "ORCAMENTO_EDITAR"));
    }

    static void assertRequer(Class<?> tipo, Map<String, String> esperado) {
        List<Method> publicos = Arrays.stream(tipo.getDeclaredMethods())
                .filter(m -> java.lang.reflect.Modifier.isPublic(m.getModifiers()) && !m.isSynthetic())
                .toList();
        assertThat(publicos).extracting(Method::getName).containsExactlyInAnyOrderElementsOf(esperado.keySet());
        for (Method m : publicos) {
            Requer r = m.getAnnotation(Requer.class);
            assertThat(r).as("@Requer em %s.%s", tipo.getSimpleName(), m.getName()).isNotNull();
            assertThat(r.value()).isEqualTo(esperado.get(m.getName()));
        }
    }
}
