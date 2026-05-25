CREATE TABLE tb_usuario_empresa (
    id               BIGSERIAL PRIMARY KEY,
    usuario_id       BIGINT NOT NULL REFERENCES tb_usuario(id),
    empresa_id       BIGINT NOT NULL REFERENCES tb_empresa(id),
    perfil_id        BIGINT NOT NULL REFERENCES tb_perfil_acesso(id),
    ativo            BOOLEAN NOT NULL DEFAULT TRUE,
    convidado_por_id BIGINT REFERENCES tb_usuario(id),
    data_ingresso    TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (usuario_id, empresa_id)
);

CREATE INDEX idx_usuario_empresa_usuario ON tb_usuario_empresa(usuario_id);
CREATE INDEX idx_usuario_empresa_empresa ON tb_usuario_empresa(empresa_id);
