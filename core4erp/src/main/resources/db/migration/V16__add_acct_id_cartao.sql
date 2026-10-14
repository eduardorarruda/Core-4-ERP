ALTER TABLE tb_cartao_credito
    ADD COLUMN IF NOT EXISTS acct_id_ofx VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cartao_acct_id_usuario
    ON tb_cartao_credito (usuario_id, acct_id_ofx)
    WHERE acct_id_ofx IS NOT NULL;
