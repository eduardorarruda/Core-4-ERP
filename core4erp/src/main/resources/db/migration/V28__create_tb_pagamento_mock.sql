CREATE TABLE tb_pagamento_mock (
    id           BIGSERIAL PRIMARY KEY,
    empresa_id   BIGINT        NOT NULL REFERENCES tb_empresa(id),
    plano_id     BIGINT        NOT NULL REFERENCES tb_plano(id),
    valor        NUMERIC(10,2) NOT NULL,
    status       VARCHAR(20)   NOT NULL DEFAULT 'PENDENTE'
                     CHECK (status IN ('PENDENTE', 'APROVADO', 'RECUSADO')),
    forma        VARCHAR(30),
    referencia   VARCHAR(100),
    created_date TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX idx_pagamento_empresa ON tb_pagamento_mock(empresa_id);
