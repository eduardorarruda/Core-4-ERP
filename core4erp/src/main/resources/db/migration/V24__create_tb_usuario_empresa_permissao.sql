CREATE TABLE tb_usuario_empresa_permissao (
    id             BIGSERIAL PRIMARY KEY,
    usuario_id     BIGINT NOT NULL REFERENCES tb_usuario(id),
    empresa_id     BIGINT NOT NULL REFERENCES tb_empresa(id),
    permissao_id   BIGINT NOT NULL REFERENCES tb_permissao(id),
    revogada       BOOLEAN NOT NULL DEFAULT FALSE,
    concedida_por  BIGINT REFERENCES tb_usuario(id),
    data_concessao TIMESTAMP NOT NULL DEFAULT NOW(),
    observacao     VARCHAR(200),
    UNIQUE (usuario_id, empresa_id, permissao_id)
);

CREATE INDEX idx_uep_usuario_empresa ON tb_usuario_empresa_permissao(usuario_id, empresa_id);
CREATE INDEX idx_uep_empresa         ON tb_usuario_empresa_permissao(empresa_id);

COMMENT ON TABLE tb_usuario_empresa_permissao IS
    'Permissões individuais por usuário dentro de uma empresa. Sobrescrevem o perfil.';
COMMENT ON COLUMN tb_usuario_empresa_permissao.revogada IS
    'false=concessão extra além do perfil | true=bloqueio mesmo que o perfil permita';
