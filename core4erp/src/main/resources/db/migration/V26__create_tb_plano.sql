CREATE TABLE tb_plano (
    id                  BIGSERIAL PRIMARY KEY,
    nome                VARCHAR(60)   NOT NULL UNIQUE,
    descricao           TEXT,
    preco_mensal        NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    max_usuarios        INT           NOT NULL DEFAULT 1,
    max_empresas        INT           NOT NULL DEFAULT 1,
    ativo               BOOLEAN       NOT NULL DEFAULT TRUE,
    created_by          VARCHAR(150),
    created_date        TIMESTAMP     DEFAULT NOW(),
    last_modified_by    VARCHAR(150),
    last_modified_date  TIMESTAMP
);

INSERT INTO tb_plano (nome, descricao, preco_mensal, max_usuarios, max_empresas) VALUES
    ('BASICO',       'Uso pessoal. 1 usuário, 1 empresa.',                    0.00,   1,  1),
    ('PROFISSIONAL', 'Pequenas empresas. Até 5 operadores.',                 49.90,   5,  1),
    ('EMPRESARIAL',  'Médias empresas. Até 20 operadores.',                 129.90,  20,  3),
    ('ENTERPRISE',   'Grandes empresas. Usuários e empresas ilimitados.',     0.00,  -1, -1);

ALTER TABLE tb_empresa
    ADD COLUMN IF NOT EXISTS plano_id          BIGINT REFERENCES tb_plano(id),
    ADD COLUMN IF NOT EXISTS plano_ativo_desde TIMESTAMP,
    ADD COLUMN IF NOT EXISTS plano_expira_em   TIMESTAMP;

UPDATE tb_empresa SET plano_id = (SELECT id FROM tb_plano WHERE nome = 'BASICO')
WHERE plano_id IS NULL;

COMMENT ON TABLE tb_plano IS 'Planos de assinatura gerenciados exclusivamente pelo Admin Sistema';
COMMENT ON COLUMN tb_plano.max_usuarios IS '-1 = ilimitado';
COMMENT ON COLUMN tb_plano.max_empresas IS '-1 = ilimitado';
