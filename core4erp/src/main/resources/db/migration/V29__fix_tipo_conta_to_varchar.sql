-- Converte tipo_conta de tipo enum nativo do PostgreSQL para VARCHAR(20)
-- O @Enumerated(EnumType.STRING) do JPA não é compatível com o tipo enum nativo do PostgreSQL
-- quando usado via setString() no JDBC, causando erro de tipo na inserção.
-- O DEFAULT precisa ser removido antes do DROP TYPE pois ele depende de tipo_conta_enum.

ALTER TABLE tb_usuario ALTER COLUMN tipo_conta DROP DEFAULT;

ALTER TABLE tb_usuario
    ALTER COLUMN tipo_conta TYPE VARCHAR(20) USING tipo_conta::VARCHAR;

ALTER TABLE tb_usuario ALTER COLUMN tipo_conta SET DEFAULT 'EMPRESA';

DROP TYPE IF EXISTS tipo_conta_enum;
