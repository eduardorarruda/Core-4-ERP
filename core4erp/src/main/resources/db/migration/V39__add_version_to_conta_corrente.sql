-- S.12: coluna de versionamento para lock otimista (@Version) em tb_conta_corrente.
-- Evita lost update do saldo em baixas/transferências/conciliações concorrentes.
-- (A dupla baixa de uma mesma conta já é barrada pela UNIQUE(conta_id) em tb_conta_baixada.)
ALTER TABLE tb_conta_corrente
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;
