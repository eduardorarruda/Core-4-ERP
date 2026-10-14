CREATE TABLE tb_auditoria (
    id             BIGSERIAL PRIMARY KEY,
    empresa_id     BIGINT NOT NULL REFERENCES tb_empresa(id),
    usuario_id     BIGINT REFERENCES tb_usuario(id),
    entidade       VARCHAR(60) NOT NULL,
    entidade_id    BIGINT,
    acao           VARCHAR(10) NOT NULL CHECK (acao IN ('CRIAR', 'EDITAR', 'DELETAR')),
    valor_anterior JSONB,
    valor_novo     JSONB,
    ip_address     VARCHAR(45),
    request_id     VARCHAR(36),
    timestamp      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_empresa   ON tb_auditoria(empresa_id);
CREATE INDEX idx_auditoria_entidade  ON tb_auditoria(entidade, entidade_id);
CREATE INDEX idx_auditoria_usuario   ON tb_auditoria(usuario_id);
CREATE INDEX idx_auditoria_timestamp ON tb_auditoria(timestamp DESC);
CREATE INDEX idx_auditoria_acao      ON tb_auditoria(acao);

COMMENT ON TABLE tb_auditoria IS 'Trilha imutável de todas as operações de escrita no sistema';
COMMENT ON COLUMN tb_auditoria.valor_anterior IS 'Estado JSON do registro antes da operação (null em CRIAR)';
COMMENT ON COLUMN tb_auditoria.valor_novo     IS 'Estado JSON do registro após a operação (null em DELETAR)';
