-- Adicionar empresa_id em todas as tabelas de negócio (nullable inicialmente)
ALTER TABLE tb_conta                    ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_conta_baixada            ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_conta_corrente           ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_cartao_credito           ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_lancamento_cartao        ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_fatura_cartao            ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_categoria                ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_parceiro                 ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_assinatura               ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_conta_investimento       ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_transacao_investimento   ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_notificacao              ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_conciliacao              ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_conciliacao_item         ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_conciliacao_cartao       ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_conciliacao_cartao_item  ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);
ALTER TABLE tb_transferencia            ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);

-- Popular empresa_id com base no usuario_id de cada tabela
UPDATE tb_conta c
SET empresa_id = ue.empresa_id
FROM tb_usuario_empresa ue
WHERE ue.usuario_id = c.usuario_id AND ue.ativo = TRUE;

UPDATE tb_conta_baixada cb
SET empresa_id = ue.empresa_id
FROM tb_usuario_empresa ue
WHERE ue.usuario_id = cb.usuario_id AND ue.ativo = TRUE;

UPDATE tb_conta_corrente cc
SET empresa_id = ue.empresa_id
FROM tb_usuario_empresa ue
WHERE ue.usuario_id = cc.usuario_id AND ue.ativo = TRUE;

UPDATE tb_cartao_credito ca
SET empresa_id = ue.empresa_id
FROM tb_usuario_empresa ue
WHERE ue.usuario_id = ca.usuario_id AND ue.ativo = TRUE;

UPDATE tb_lancamento_cartao lc
SET empresa_id = ue.empresa_id
FROM tb_usuario_empresa ue
WHERE ue.usuario_id = lc.usuario_id AND ue.ativo = TRUE;

UPDATE tb_fatura_cartao fc
SET empresa_id = c.empresa_id
FROM tb_cartao_credito c
WHERE fc.cartao_credito_id = c.id;

UPDATE tb_categoria cat
SET empresa_id = ue.empresa_id
FROM tb_usuario_empresa ue
WHERE ue.usuario_id = cat.usuario_id AND ue.ativo = TRUE;

UPDATE tb_parceiro p
SET empresa_id = ue.empresa_id
FROM tb_usuario_empresa ue
WHERE ue.usuario_id = p.usuario_id AND ue.ativo = TRUE;

UPDATE tb_assinatura a
SET empresa_id = ue.empresa_id
FROM tb_usuario_empresa ue
WHERE ue.usuario_id = a.usuario_id AND ue.ativo = TRUE;

UPDATE tb_conta_investimento ci
SET empresa_id = ue.empresa_id
FROM tb_usuario_empresa ue
WHERE ue.usuario_id = ci.usuario_id AND ue.ativo = TRUE;

UPDATE tb_transacao_investimento ti
SET empresa_id = ci.empresa_id
FROM tb_conta_investimento ci
WHERE ti.conta_investimento_id = ci.id;

UPDATE tb_notificacao n
SET empresa_id = ue.empresa_id
FROM tb_usuario_empresa ue
WHERE ue.usuario_id = n.usuario_id AND ue.ativo = TRUE;

UPDATE tb_conciliacao con
SET empresa_id = ue.empresa_id
FROM tb_usuario_empresa ue
WHERE ue.usuario_id = con.usuario_id AND ue.ativo = TRUE;

UPDATE tb_conciliacao_item ci
SET empresa_id = con.empresa_id
FROM tb_conciliacao con
WHERE ci.conciliacao_id = con.id;

UPDATE tb_conciliacao_cartao cc
SET empresa_id = ue.empresa_id
FROM tb_usuario_empresa ue
WHERE ue.usuario_id = cc.usuario_id AND ue.ativo = TRUE;

UPDATE tb_conciliacao_cartao_item cci
SET empresa_id = cc.empresa_id
FROM tb_conciliacao_cartao cc
WHERE cci.conciliacao_cartao_id = cc.id;

UPDATE tb_transferencia t
SET empresa_id = ue.empresa_id
FROM tb_usuario_empresa ue
WHERE ue.usuario_id = t.usuario_id AND ue.ativo = TRUE;

-- Tornar empresa_id NOT NULL em todas as tabelas
ALTER TABLE tb_conta                   ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_conta_baixada           ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_conta_corrente          ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_cartao_credito          ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_lancamento_cartao       ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_fatura_cartao           ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_categoria               ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_parceiro                ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_assinatura              ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_conta_investimento      ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_transacao_investimento  ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_notificacao             ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_conciliacao             ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_conciliacao_item        ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_conciliacao_cartao      ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_conciliacao_cartao_item ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE tb_transferencia           ALTER COLUMN empresa_id SET NOT NULL;

-- Índices de performance por empresa
CREATE INDEX idx_conta_empresa                   ON tb_conta(empresa_id);
CREATE INDEX idx_conta_baixada_empresa           ON tb_conta_baixada(empresa_id);
CREATE INDEX idx_conta_corrente_empresa          ON tb_conta_corrente(empresa_id);
CREATE INDEX idx_cartao_empresa                  ON tb_cartao_credito(empresa_id);
CREATE INDEX idx_lancamento_cartao_empresa       ON tb_lancamento_cartao(empresa_id);
CREATE INDEX idx_fatura_cartao_empresa           ON tb_fatura_cartao(empresa_id);
CREATE INDEX idx_categoria_empresa               ON tb_categoria(empresa_id);
CREATE INDEX idx_parceiro_empresa                ON tb_parceiro(empresa_id);
CREATE INDEX idx_assinatura_empresa              ON tb_assinatura(empresa_id);
CREATE INDEX idx_conta_investimento_empresa      ON tb_conta_investimento(empresa_id);
CREATE INDEX idx_transacao_investimento_empresa  ON tb_transacao_investimento(empresa_id);
CREATE INDEX idx_notificacao_empresa             ON tb_notificacao(empresa_id);
CREATE INDEX idx_conciliacao_empresa             ON tb_conciliacao(empresa_id);
CREATE INDEX idx_conciliacao_item_empresa        ON tb_conciliacao_item(empresa_id);
CREATE INDEX idx_conciliacao_cartao_empresa      ON tb_conciliacao_cartao(empresa_id);
CREATE INDEX idx_conciliacao_cartao_item_empresa ON tb_conciliacao_cartao_item(empresa_id);
CREATE INDEX idx_transferencia_empresa           ON tb_transferencia(empresa_id);
