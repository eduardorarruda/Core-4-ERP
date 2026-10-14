-- V51 — Cifra em repouso (AES-256-GCM) dos identificadores bancários vindos do OFX, completando a V47.
--
--   tb_conciliacao.agencia / numero_conta_ofx   → só exibidos (não pesquisados): sem índice.
--   tb_conciliacao_cartao.acct_id_ofx            → só exibido: sem índice.
--   tb_cartao_credito.acct_id_ofx                → usado para casar o OFX com o cartão:
--                                                  índice cego acct_id_ofx_hash (HMAC-SHA256 hex).
--
-- Os valores legados são cifrados na subida pelo MigradorCriptografiaCampos (idempotente: só
-- processa valores sem o prefixo 'v1:'). O UNIQUE parcial é criado com a coluna ainda vazia.

ALTER TABLE tb_conciliacao ALTER COLUMN agencia TYPE VARCHAR(255);
ALTER TABLE tb_conciliacao ALTER COLUMN numero_conta_ofx TYPE VARCHAR(255);

ALTER TABLE tb_conciliacao_cartao ALTER COLUMN acct_id_ofx TYPE VARCHAR(255);

ALTER TABLE tb_cartao_credito ALTER COLUMN acct_id_ofx TYPE VARCHAR(255);
ALTER TABLE tb_cartao_credito ADD COLUMN IF NOT EXISTS acct_id_ofx_hash VARCHAR(64);
-- O índice da V16 sobre o texto (por usuário) perde o sentido com o valor cifrado (aleatório a cada
-- gravação); a unicidade passa a ser por empresa (tenant), sobre o índice cego.
DROP INDEX IF EXISTS idx_cartao_acct_id_usuario;
CREATE UNIQUE INDEX IF NOT EXISTS uk_cartao_acct_id_hash_empresa
    ON tb_cartao_credito (acct_id_ofx_hash, empresa_id)
    WHERE acct_id_ofx_hash IS NOT NULL;

COMMENT ON COLUMN tb_conciliacao.agencia IS 'Agência do OFX cifrada (AES-256-GCM, prefixo v1:) — nunca filtrar por esta coluna';
COMMENT ON COLUMN tb_conciliacao.numero_conta_ofx IS 'Número da conta do OFX cifrado (AES-256-GCM, prefixo v1:)';
COMMENT ON COLUMN tb_conciliacao_cartao.acct_id_ofx IS 'ACCTID do OFX cifrado (AES-256-GCM, prefixo v1:)';
COMMENT ON COLUMN tb_cartao_credito.acct_id_ofx IS 'ACCTID do OFX cifrado (AES-256-GCM, prefixo v1:) — buscar por acct_id_ofx_hash';
COMMENT ON COLUMN tb_cartao_credito.acct_id_ofx_hash IS 'Índice cego HMAC-SHA256 do ACCTID do cartão';
