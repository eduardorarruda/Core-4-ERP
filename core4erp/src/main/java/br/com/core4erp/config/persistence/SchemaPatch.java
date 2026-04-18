package br.com.core4erp.config.persistence;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class SchemaPatch {

    private final JdbcTemplate jdbc;

    public SchemaPatch(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void aplicar() {
        // ContaCorrente: remoção de coluna legada
        executar("ALTER TABLE tb_conta_corrente DROP COLUMN IF EXISTS apelido");

        // Parceiro: remoção de colunas legadas
        executar("ALTER TABLE tb_parceiro DROP COLUMN IF EXISTS endereco");
        executar("ALTER TABLE tb_parceiro DROP COLUMN IF EXISTS data_nascimento_fundacao");

        // LancamentoCartao: colunas adicionadas com NOT NULL falham se linhas existiam
        // Adiciona com DEFAULT para garantir que linhas antigas recebam valor válido
        executar("ALTER TABLE tb_lancamento_cartao ADD COLUMN IF NOT EXISTS grupo_parcelamento VARCHAR(255)");
        executar("ALTER TABLE tb_lancamento_cartao ADD COLUMN IF NOT EXISTS numero_parcela INTEGER DEFAULT 1");
        executar("ALTER TABLE tb_lancamento_cartao ADD COLUMN IF NOT EXISTS total_parcelas INTEGER DEFAULT 1");
        executar("UPDATE tb_lancamento_cartao SET numero_parcela = 1 WHERE numero_parcela IS NULL");
        executar("UPDATE tb_lancamento_cartao SET total_parcelas = 1 WHERE total_parcelas IS NULL");
    }

    private void executar(String sql) {
        try {
            jdbc.execute(sql);
        } catch (Exception ignored) {
        }
    }
}
