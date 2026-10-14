-- V47 — Criptografia em repouso (AES-256-GCM) de CPF/CNPJ e dados bancários + índices cegos (HMAC).
--
-- Os valores passam a ser gravados como 'v1:<base64(iv||ciphertext||tag)>' pelo
-- CampoCriptografadoConverter (≈70 chars p/ um CNPJ) → colunas alargadas para VARCHAR(255).
-- Busca exata e unicidade migram para as colunas *_hash (HMAC-SHA256 hex = 64 chars), pois o
-- texto cifrado é aleatório a cada gravação.
--
-- Os dados legados em texto puro são cifrados na subida pelo MigradorCriptografiaCampos
-- (idempotente: só processa valores sem o prefixo 'v1:'). Até lá, o converter lê texto puro sem erro.
-- Os UNIQUE são parciais (hash IS NOT NULL) e criados com as colunas ainda vazias — nunca falham aqui.

-- ── Parceiros: CPF/CNPJ único por empresa ───────────────────────────────────
ALTER TABLE tb_parceiro ALTER COLUMN cpf_cnpj TYPE VARCHAR(255);
ALTER TABLE tb_parceiro ADD COLUMN IF NOT EXISTS cpf_cnpj_hash VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS uk_parceiro_cpf_cnpj_hash_empresa
    ON tb_parceiro (cpf_cnpj_hash, empresa_id)
    WHERE cpf_cnpj_hash IS NOT NULL;

-- ── Empresas: CNPJ único no sistema ─────────────────────────────────────────
ALTER TABLE tb_empresa ALTER COLUMN cnpj TYPE VARCHAR(255);
ALTER TABLE tb_empresa ADD COLUMN IF NOT EXISTS cnpj_hash VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS uk_empresa_cnpj_hash
    ON tb_empresa (cnpj_hash)
    WHERE cnpj_hash IS NOT NULL;

-- ── Contas correntes: número único por empresa (substitui o índice da V35) ──
ALTER TABLE tb_conta_corrente ALTER COLUMN numero_conta TYPE VARCHAR(255);
ALTER TABLE tb_conta_corrente ALTER COLUMN agencia TYPE VARCHAR(255);
ALTER TABLE tb_conta_corrente ADD COLUMN IF NOT EXISTS numero_conta_hash VARCHAR(64);
-- O índice sobre o texto cifrado não garante nada (cada gravação gera um valor diferente).
DROP INDEX IF EXISTS idx_conta_corrente_numero_empresa;
CREATE UNIQUE INDEX IF NOT EXISTS uk_conta_corrente_numero_hash_empresa
    ON tb_conta_corrente (numero_conta_hash, empresa_id)
    WHERE numero_conta_hash IS NOT NULL;

COMMENT ON COLUMN tb_parceiro.cpf_cnpj IS 'CPF/CNPJ cifrado (AES-256-GCM, prefixo v1:) — nunca filtrar por esta coluna';
COMMENT ON COLUMN tb_parceiro.cpf_cnpj_hash IS 'Índice cego HMAC-SHA256 do CPF/CNPJ (só dígitos)';
COMMENT ON COLUMN tb_empresa.cnpj_hash IS 'Índice cego HMAC-SHA256 do CNPJ (só dígitos)';
COMMENT ON COLUMN tb_conta_corrente.numero_conta_hash IS 'Índice cego HMAC-SHA256 do número da conta';
