-- Adiciona colunas de auditoria JPA (Auditable) a tb_tipo_investimento,
-- necessárias após a entidade TipoInvestimentoCustom passar a estender TenantEntity.
-- Colunas são nullable — registros existentes ficam com NULL.

ALTER TABLE tb_tipo_investimento
    ADD COLUMN IF NOT EXISTS created_by       VARCHAR(100),
    ADD COLUMN IF NOT EXISTS created_date     TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_modified_by VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_modified_date TIMESTAMP;
