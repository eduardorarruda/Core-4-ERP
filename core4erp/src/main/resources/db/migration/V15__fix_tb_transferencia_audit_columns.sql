ALTER TABLE tb_transferencia
    DROP COLUMN IF EXISTS created_at,
    DROP COLUMN IF EXISTS updated_at,
    ADD COLUMN IF NOT EXISTS created_by        VARCHAR(100),
    ADD COLUMN IF NOT EXISTS created_date      TIMESTAMP,
    ADD COLUMN IF NOT EXISTS last_modified_by  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_modified_date TIMESTAMP;
