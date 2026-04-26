ALTER TABLE tb_usuario ADD COLUMN login_attempts INT NOT NULL DEFAULT 0;
ALTER TABLE tb_usuario ADD COLUMN locked_until TIMESTAMP;
