-- Rastreio de classificação de categoria feita pela IA (a pedido do usuário) em contas e
-- lançamentos de cartão. `confianca_ia` guarda a confiança (0..1) que o modelo reportou.
ALTER TABLE tb_conta
    ADD COLUMN classificada_por_ia BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN confianca_ia NUMERIC(5,4);

ALTER TABLE tb_lancamento_cartao
    ADD COLUMN classificado_por_ia BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN confianca_ia NUMERIC(5,4);
