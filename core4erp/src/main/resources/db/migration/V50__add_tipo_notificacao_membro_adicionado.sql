-- V50 — Novo tipo de notificação MEMBRO_ADICIONADO (usuário existente adicionado diretamente a uma
-- empresa pelo ConviteService). A coluna tipo tem CHECK constraint desde a V1 — recria incluindo o
-- novo valor. VARCHAR(20) comporta 'MEMBRO_ADICIONADO' (17).
ALTER TABLE tb_notificacao DROP CONSTRAINT IF EXISTS tb_notificacao_tipo_check;
ALTER TABLE tb_notificacao ADD CONSTRAINT tb_notificacao_tipo_check
    CHECK (tipo IN ('VENCIMENTO', 'FATURA', 'MEMBRO_ADICIONADO'));
