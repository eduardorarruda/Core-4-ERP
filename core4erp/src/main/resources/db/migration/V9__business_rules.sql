-- R2: Trava de estorno — marca conta como conciliada quando finalizada via conciliação
ALTER TABLE tb_conta ADD COLUMN conciliada BOOLEAN NOT NULL DEFAULT FALSE;

-- R6: Data de referência do saldo inicial da conta corrente
ALTER TABLE tb_conta_corrente ADD COLUMN data_saldo_inicial DATE;

-- R3: Tipos de investimento definidos pelo usuário (substituição do enum fixo)
CREATE TABLE tb_tipo_investimento (
    id          BIGSERIAL PRIMARY KEY,
    nome        VARCHAR(100) NOT NULL,
    usuario_id  BIGINT NOT NULL REFERENCES tb_usuario(id)
);

ALTER TABLE tb_conta_investimento
    ADD COLUMN tipo_investimento_id BIGINT REFERENCES tb_tipo_investimento(id);

-- R4: Parceiro obrigatório no lançamento de cartão de crédito
ALTER TABLE tb_lancamento_cartao
    ADD COLUMN parceiro_id BIGINT REFERENCES tb_parceiro(id);
