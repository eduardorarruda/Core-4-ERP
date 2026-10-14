-- Adiciona campo tipo em tb_lancamento_cartao para suportar entradas (créditos/estornos)
ALTER TABLE tb_lancamento_cartao
    ADD COLUMN tipo VARCHAR(10) NOT NULL DEFAULT 'SAIDA';

CREATE INDEX idx_lancamento_tipo ON tb_lancamento_cartao(tipo);
