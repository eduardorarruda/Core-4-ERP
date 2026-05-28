CREATE TABLE tb_convite (
    id              BIGSERIAL PRIMARY KEY,
    empresa_id      BIGINT       NOT NULL REFERENCES tb_empresa(id),
    email_convidado VARCHAR(150) NOT NULL,
    perfil_id       BIGINT       NOT NULL REFERENCES tb_perfil_acesso(id),
    token           VARCHAR(64)  NOT NULL UNIQUE,
    expira_em       TIMESTAMP    NOT NULL,
    aceito          BOOLEAN      NOT NULL DEFAULT FALSE,
    convidado_por   BIGINT       NOT NULL REFERENCES tb_usuario(id),
    created_date    TIMESTAMP    DEFAULT NOW(),
    UNIQUE (empresa_id, email_convidado)
);

CREATE INDEX idx_convite_token   ON tb_convite(token);
CREATE INDEX idx_convite_empresa ON tb_convite(empresa_id);

COMMENT ON TABLE tb_convite IS 'Convites pendentes para novos operadores. Token expira em 48h.';
