CREATE TABLE tb_conciliacao_cartao (
    id                        BIGSERIAL PRIMARY KEY,
    data_conciliacao          TIMESTAMP NOT NULL,
    cartao_credito_id         BIGINT NOT NULL REFERENCES tb_cartao_credito(id),
    status                    VARCHAR(30) NOT NULL,
    acct_id_ofx               VARCHAR(100),
    data_inicio_ofx           DATE,
    data_fim_ofx              DATE,
    total_transacoes          INT NOT NULL DEFAULT 0,
    total_conciliados         INT NOT NULL DEFAULT 0,
    total_nao_identificados   INT NOT NULL DEFAULT 0,
    observacao                TEXT,
    usuario_id                BIGINT NOT NULL REFERENCES tb_usuario(id),
    created_date              TIMESTAMP,
    last_modified_date        TIMESTAMP,
    created_by                VARCHAR(100),
    last_modified_by          VARCHAR(100)
);

CREATE TABLE tb_conciliacao_cartao_item (
    id                        BIGSERIAL PRIMARY KEY,
    conciliacao_cartao_id     BIGINT NOT NULL REFERENCES tb_conciliacao_cartao(id),
    ofx_id                    VARCHAR(100) NOT NULL,
    ofx_tipo                  VARCHAR(20),
    ofx_valor                 DECIMAL(15,2) NOT NULL,
    ofx_data                  DATE NOT NULL,
    ofx_memo                  VARCHAR(500),
    lancamento_id             BIGINT REFERENCES tb_lancamento_cartao(id),
    score_vinculacao          INT,
    status_item               VARCHAR(40) NOT NULL,
    lancamento_criado_aqui    BOOLEAN NOT NULL DEFAULT FALSE,
    lancamento_baixado        BOOLEAN NOT NULL DEFAULT FALSE,
    usuario_id                BIGINT NOT NULL REFERENCES tb_usuario(id),
    created_date              TIMESTAMP,
    last_modified_date        TIMESTAMP,
    created_by                VARCHAR(100),
    last_modified_by          VARCHAR(100),
    CONSTRAINT uq_conc_cartao_item UNIQUE (conciliacao_cartao_id, ofx_id)
);

CREATE INDEX idx_conc_cartao_usuario   ON tb_conciliacao_cartao(usuario_id);
CREATE INDEX idx_conc_cartao_status    ON tb_conciliacao_cartao(status);
CREATE INDEX idx_conc_cartao_item_conc ON tb_conciliacao_cartao_item(conciliacao_cartao_id);
CREATE INDEX idx_conc_cartao_item_lanc ON tb_conciliacao_cartao_item(lancamento_id);
