package br.com.core4erp.conta.repository;

import br.com.core4erp.conta.entity.Conta;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Root;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.RETURNS_DEEP_STUBS;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Busca livre de contas: normalização do termo, escape de curingas e LEFT JOIN no parceiro. */
class ContaSpecBuscaTest {

    @Test
    void normalizarBusca_nuloOuEmBranco_ignora() {
        assertNull(ContaSpec.normalizarBusca(null));
        assertNull(ContaSpec.normalizarBusca(""));
        assertNull(ContaSpec.normalizarBusca("   \t "));
    }

    @Test
    void normalizarBusca_aplicaTrim() {
        assertEquals("aluguel", ContaSpec.normalizarBusca("  aluguel "));
    }

    @Test
    void normalizarBusca_limitaA100Caracteres() {
        String longo = "x".repeat(150);
        assertEquals(ContaSpec.BUSCA_MAX, ContaSpec.normalizarBusca(longo).length());
    }

    @Test
    void escaparLike_escapaPercentSublinhadoEBarra() {
        assertEquals("50\\% off", ContaSpec.escaparLike("50% off"));
        assertEquals("nf\\_123", ContaSpec.escaparLike("nf_123"));
        assertEquals("a\\\\b", ContaSpec.escaparLike("a\\b"));
        assertEquals("texto comum", ContaSpec.escaparLike("texto comum"));
    }

    @Test
    void padraoContem_minusculoEnvoltoEmPercent() {
        assertEquals("%aluguel\\_100\\%%", ContaSpec.padraoContem("ALUGUEL_100%"));
    }

    @Test
    @SuppressWarnings("unchecked")
    void busca_usaLeftJoinNoParceiroEEscapeEmTodosOsCampos() {
        Root<Conta> root = mock(Root.class, RETURNS_DEEP_STUBS);
        Join<Object, Object> parceiro = mock(Join.class, RETURNS_DEEP_STUBS);
        CriteriaQuery<?> query = mock(CriteriaQuery.class);
        CriteriaBuilder cb = mock(CriteriaBuilder.class, RETURNS_DEEP_STUBS);
        when(root.join("parceiro", JoinType.LEFT)).thenReturn((Join) parceiro);

        ContaSpec.busca("Aluguel%").toPredicate(root, query, cb);

        verify(root).join("parceiro", JoinType.LEFT);
        verify(root).get("descricao");
        verify(root).get("numeroDocumento");
        verify(parceiro).get("razaoSocial");
        verify(parceiro).get("nomeFantasia");
        verify(cb, times(4)).like(any(Expression.class), eq("%aluguel\\%%"), eq('\\'));
    }
}
