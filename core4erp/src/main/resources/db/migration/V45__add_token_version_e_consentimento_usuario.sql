-- V45: segurança de sessão + consentimento LGPD em tb_usuario.
--  token_version     → claim "tv" do JWT; incrementar revoga todos os tokens já emitidos
--                      (troca/redefinição de senha, logout de todos os dispositivos, exclusão de conta).
--  termos_aceitos_em → momento do aceite dos Termos de Uso e da Política de Privacidade (LGPD art. 8º).
--  termos_versao     → versão dos documentos aceitos.
-- Idempotente (IF NOT EXISTS) para bancos com out-of-order habilitado em dev.
ALTER TABLE tb_usuario
    ADD COLUMN IF NOT EXISTS token_version     INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS termos_aceitos_em TIMESTAMP,
    ADD COLUMN IF NOT EXISTS termos_versao     VARCHAR(20);
