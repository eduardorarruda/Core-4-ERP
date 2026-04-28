-- Vincula assinatura a um cartão de crédito (nullable = assinatura de conta comum)
ALTER TABLE tb_assinatura
    ADD COLUMN cartao_credito_id BIGINT REFERENCES tb_cartao_credito(id);

-- Rastreia qual assinatura gerou cada lançamento de cartão
ALTER TABLE tb_lancamento_cartao
    ADD COLUMN assinatura_id BIGINT REFERENCES tb_assinatura(id);

-- Garante no máximo um lançamento por assinatura por fatura (idempotência do scheduler)
CREATE UNIQUE INDEX uq_lancamento_assinatura_fatura
    ON tb_lancamento_cartao(assinatura_id, mes_fatura, ano_fatura)
    WHERE assinatura_id IS NOT NULL;
