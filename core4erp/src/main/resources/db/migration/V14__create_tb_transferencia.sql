CREATE TABLE tb_transferencia (
    id                  BIGSERIAL PRIMARY KEY,
    conta_origem_id     BIGINT        NOT NULL REFERENCES tb_conta_corrente(id),
    conta_destino_id    BIGINT        NOT NULL REFERENCES tb_conta_corrente(id),
    usuario_id          BIGINT        NOT NULL REFERENCES tb_usuario(id),
    valor               NUMERIC(15,2) NOT NULL,
    data_transferencia  DATE          NOT NULL,
    created_at          TIMESTAMP,
    updated_at          TIMESTAMP
);
