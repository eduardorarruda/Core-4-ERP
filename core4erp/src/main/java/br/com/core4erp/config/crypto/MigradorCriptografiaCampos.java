package br.com.core4erp.config.crypto;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.util.List;
import java.util.Map;
import java.util.function.UnaryOperator;

/**
 * Migração única e idempotente dos dados legados em texto puro para o formato cifrado (V47/V51).
 *
 * <p>Para cada coluna sensível, processa em lotes as linhas cujo valor ainda NÃO tem o prefixo
 * {@code v1:} — o próprio prefixo é o marcador (re-executar não re-cifra nada e termina na hora).
 * Cifra o valor e preenche o índice cego ({@code *_hash}). Usa JDBC puro (sem entidades) para não
 * depender do converter JPA.
 *
 * <p>Roda em {@link SmartInitializingSingleton} — depois do Flyway (V47 já aplicada) e ANTES de o
 * Tomcat aceitar requisições, para que nenhuma busca por índice cego encontre linhas pendentes.
 * Desligável com {@code app.crypto.migrar-na-subida=false}.
 *
 * <p>Duplicidade legada (dois registros com o mesmo documento na mesma empresa): o valor é cifrado
 * mesmo assim, mas o índice fica nulo naquele registro (o UNIQUE parcial o rejeitaria) e um WARN
 * com o id é registrado para saneamento manual — a subida nunca é bloqueada por isso.
 */
@Component
public class MigradorCriptografiaCampos implements SmartInitializingSingleton {

    private static final Logger log = LoggerFactory.getLogger(MigradorCriptografiaCampos.class);

    static final int TAMANHO_LOTE = 500;

    /** Coluna sensível + coluna de índice (opcional) + normalização usada no índice. */
    record Alvo(String tabela, String coluna, String colunaHash, UnaryOperator<String> indice) {}

    private final JdbcTemplate jdbc;
    private final CriptografiaCampos criptografia;
    private final boolean habilitado;

    @Autowired
    public MigradorCriptografiaCampos(@Qualifier("dataSource") DataSource dataSource,
                                      CriptografiaCampos criptografia,
                                      @Value("${app.crypto.migrar-na-subida:true}") boolean habilitado) {
        this(new JdbcTemplate(dataSource), criptografia, habilitado);
    }

    MigradorCriptografiaCampos(JdbcTemplate jdbc, CriptografiaCampos criptografia, boolean habilitado) {
        this.jdbc = jdbc;
        this.criptografia = criptografia;
        this.habilitado = habilitado;
    }

    static List<Alvo> alvos() {
        return List.of(
                new Alvo("tb_parceiro", "cpf_cnpj", "cpf_cnpj_hash", IndiceCego::documento),
                new Alvo("tb_empresa", "cnpj", "cnpj_hash", IndiceCego::documento),
                new Alvo("tb_conta_corrente", "numero_conta", "numero_conta_hash", IndiceCego::numeroConta),
                new Alvo("tb_conta_corrente", "agencia", null, null),
                // V51 — identificadores bancários vindos do OFX
                new Alvo("tb_cartao_credito", "acct_id_ofx", "acct_id_ofx_hash", IndiceCego::acctIdCartao),
                new Alvo("tb_conciliacao", "agencia", null, null),
                new Alvo("tb_conciliacao", "numero_conta_ofx", null, null),
                new Alvo("tb_conciliacao_cartao", "acct_id_ofx", null, null));
    }

    @Override
    public void afterSingletonsInstantiated() {
        if (!habilitado) {
            log.info("[CRYPTO] migração de campos cifrados desabilitada (app.crypto.migrar-na-subida=false)");
            return;
        }
        for (Alvo alvo : alvos()) {
            int total = migrar(alvo);
            if (total > 0) {
                log.atInfo()
                        .addKeyValue("evento", "crypto.migracao_campos")
                        .addKeyValue("tabela", alvo.tabela())
                        .addKeyValue("coluna", alvo.coluna())
                        .addKeyValue("linhas", total)
                        .log("[CRYPTO] valores legados cifrados");
            }
        }
    }

    /** Cifra todas as linhas pendentes de um alvo. Retorna quantas linhas foram migradas. */
    int migrar(Alvo alvo) {
        // Nomes de tabela/coluna vêm da lista fixa acima (nunca de entrada externa).
        String selecao = "SELECT id, " + alvo.coluna() + " AS valor FROM " + alvo.tabela()
                + " WHERE " + alvo.coluna() + " IS NOT NULL AND " + alvo.coluna() + " NOT LIKE 'v1:%'"
                + " ORDER BY id LIMIT " + TAMANHO_LOTE;
        int total = 0;
        while (true) {
            List<Map<String, Object>> lote = jdbc.queryForList(selecao);
            if (lote.isEmpty()) {
                return total;
            }
            for (Map<String, Object> linha : lote) {
                migrarLinha(alvo, ((Number) linha.get("id")).longValue(), (String) linha.get("valor"));
                total++;
            }
        }
    }

    private void migrarLinha(Alvo alvo, long id, String valor) {
        String cifrado = criptografia.cifrar(valor);
        if (alvo.colunaHash() == null) {
            jdbc.update("UPDATE " + alvo.tabela() + " SET " + alvo.coluna() + " = ? WHERE id = ?", cifrado, id);
            return;
        }
        String hash = alvo.indice().apply(valor);
        try {
            jdbc.update("UPDATE " + alvo.tabela() + " SET " + alvo.coluna() + " = ?, " + alvo.colunaHash()
                    + " = ? WHERE id = ?", cifrado, hash, id);
        } catch (DuplicateKeyException e) {
            // Duplicidade legada: cifra mesmo assim, sem índice, e sinaliza para saneamento manual.
            jdbc.update("UPDATE " + alvo.tabela() + " SET " + alvo.coluna() + " = ?, " + alvo.colunaHash()
                    + " = NULL WHERE id = ?", cifrado, id);
            log.atWarn()
                    .addKeyValue("evento", "crypto.duplicidade_legada")
                    .addKeyValue("tabela", alvo.tabela())
                    .addKeyValue("registroId", id)
                    .log("[CRYPTO] valor duplicado na mesma empresa — cifrado sem índice cego; revisar manualmente");
        }
    }
}
