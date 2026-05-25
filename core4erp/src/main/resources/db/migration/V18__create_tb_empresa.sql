CREATE TABLE tb_empresa (
    id                  BIGSERIAL PRIMARY KEY,
    nome                VARCHAR(150) NOT NULL,
    cnpj                VARCHAR(18),
    email_contato       VARCHAR(150),
    telefone            VARCHAR(20),
    plano               VARCHAR(30) NOT NULL DEFAULT 'BASICO',
    ativa               BOOLEAN NOT NULL DEFAULT TRUE,
    created_by          VARCHAR(150),
    created_date        TIMESTAMP DEFAULT NOW(),
    last_modified_by    VARCHAR(150),
    last_modified_date  TIMESTAMP
);

COMMENT ON TABLE tb_empresa IS 'Tenant — agrupa usuários e dados de um mesmo contexto empresarial';
