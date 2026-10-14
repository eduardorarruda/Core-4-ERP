package br.com.core4erp.config.crypto;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MigradorCriptografiaCamposTest {

    private CriptografiaCampos cripto;
    private JdbcTemplate jdbc;

    @BeforeEach
    void setUp() {
        cripto = CryptoTestKeys.inicializar();
        jdbc = mock(JdbcTemplate.class);
    }

    private static MigradorCriptografiaCampos.Alvo alvoParceiro() {
        return MigradorCriptografiaCampos.alvos().get(0);
    }

    @Test
    void migrar_cifraLinhasPendentesEPreencheIndice_ateNaoHaverMais() {
        when(jdbc.queryForList(contains("FROM tb_parceiro")))
                .thenReturn(List.of(Map.of("id", 1L, "valor", "52998224725")))
                .thenReturn(List.of());
        MigradorCriptografiaCampos migrador = new MigradorCriptografiaCampos(jdbc, cripto, true);

        int total = migrador.migrar(alvoParceiro());

        assertEquals(1, total);
        ArgumentCaptor<Object> cifrado = ArgumentCaptor.forClass(Object.class);
        ArgumentCaptor<Object> hash = ArgumentCaptor.forClass(Object.class);
        verify(jdbc).update(eq("UPDATE tb_parceiro SET cpf_cnpj = ?, cpf_cnpj_hash = ? WHERE id = ?"),
                cifrado.capture(), hash.capture(), eq(1L));
        assertTrue(((String) cifrado.getValue()).startsWith("v1:"));
        assertEquals("52998224725", cripto.decifrar((String) cifrado.getValue()));
        assertEquals(IndiceCego.documento("52998224725"), hash.getValue());
    }

    @Test
    void migrar_selecionaSomenteValoresSemPrefixo_idempotente() {
        when(jdbc.queryForList(anyString())).thenReturn(List.of());
        new MigradorCriptografiaCampos(jdbc, cripto, true).migrar(alvoParceiro());
        verify(jdbc).queryForList(contains("NOT LIKE 'v1:%'"));
        verify(jdbc, never()).update(anyString(), (Object[]) org.mockito.ArgumentMatchers.any());
    }

    @Test
    void migrar_duplicidadeLegada_cifraSemIndiceENaoInterrompe() {
        when(jdbc.queryForList(contains("FROM tb_parceiro")))
                .thenReturn(List.of(Map.of("id", 9L, "valor", "52998224725")))
                .thenReturn(List.of());
        when(jdbc.update(eq("UPDATE tb_parceiro SET cpf_cnpj = ?, cpf_cnpj_hash = ? WHERE id = ?"),
                org.mockito.ArgumentMatchers.<Object>any(), org.mockito.ArgumentMatchers.<Object>any(), eq(9L)))
                .thenThrow(new DuplicateKeyException("uk_parceiro_cpf_cnpj_hash_empresa"));

        int total = new MigradorCriptografiaCampos(jdbc, cripto, true).migrar(alvoParceiro());

        assertEquals(1, total);
        verify(jdbc).update(eq("UPDATE tb_parceiro SET cpf_cnpj = ?, cpf_cnpj_hash = NULL WHERE id = ?"),
                org.mockito.ArgumentMatchers.<Object>any(), eq(9L));
    }

    @Test
    void migrar_alvoSemIndice_atualizaSoAColuna() {
        MigradorCriptografiaCampos.Alvo agencia = MigradorCriptografiaCampos.alvos().get(3);
        when(jdbc.queryForList(contains("FROM tb_conta_corrente")))
                .thenReturn(List.of(Map.of("id", 3L, "valor", "0001")))
                .thenReturn(List.of());

        new MigradorCriptografiaCampos(jdbc, cripto, true).migrar(agencia);

        verify(jdbc).update(eq("UPDATE tb_conta_corrente SET agencia = ? WHERE id = ?"),
                org.mockito.ArgumentMatchers.<Object>any(), eq(3L));
    }

    @Test
    void desabilitado_naoTocaNoBanco() {
        new MigradorCriptografiaCampos(jdbc, cripto, false).afterSingletonsInstantiated();
        verify(jdbc, never()).queryForList(anyString());
    }

    @Test
    void alvos_incluemIdentificadoresBancariosDoOfx() {
        List<String> colunas = MigradorCriptografiaCampos.alvos().stream()
                .map(a -> a.tabela() + "." + a.coluna())
                .toList();
        assertTrue(colunas.containsAll(List.of(
                "tb_cartao_credito.acct_id_ofx",
                "tb_conciliacao.agencia",
                "tb_conciliacao.numero_conta_ofx",
                "tb_conciliacao_cartao.acct_id_ofx")));
    }

    @Test
    void migrar_acctIdCartao_preencheIndiceCegoDoCartao() {
        MigradorCriptografiaCampos.Alvo acct = MigradorCriptografiaCampos.alvos().stream()
                .filter(a -> a.tabela().equals("tb_cartao_credito"))
                .findFirst().orElseThrow();
        when(jdbc.queryForList(contains("FROM tb_cartao_credito")))
                .thenReturn(List.of(Map.of("id", 5L, "valor", "4111-XX")))
                .thenReturn(List.of());

        new MigradorCriptografiaCampos(jdbc, cripto, true).migrar(acct);

        ArgumentCaptor<Object> cifrado = ArgumentCaptor.forClass(Object.class);
        verify(jdbc).update(eq("UPDATE tb_cartao_credito SET acct_id_ofx = ?, acct_id_ofx_hash = ? WHERE id = ?"),
                cifrado.capture(), eq(IndiceCego.acctIdCartao("4111-XX")), eq(5L));
        assertEquals("4111-XX", cripto.decifrar((String) cifrado.getValue()));
    }
}
