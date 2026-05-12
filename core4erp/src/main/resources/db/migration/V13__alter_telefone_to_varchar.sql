ALTER TABLE tb_usuario
    ALTER COLUMN telefone TYPE VARCHAR(20) USING telefone::TEXT;
