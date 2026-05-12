ALTER TABLE tb_usuario ADD COLUMN IF NOT EXISTS reset_token VARCHAR(64) UNIQUE;
ALTER TABLE tb_usuario ADD COLUMN IF NOT EXISTS reset_token_expiry TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_usuario_reset_token ON tb_usuario(reset_token) WHERE reset_token IS NOT NULL;
