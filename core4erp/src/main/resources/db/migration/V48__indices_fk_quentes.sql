-- V48 — Índices em colunas de FK usadas em JOIN/filtro e em verificações de integridade
-- ("não excluir se houver dependentes"). O PostgreSQL NÃO cria índice automático em FK: sem eles,
-- cada existsBy.../JOIN faz seq scan na tabela filha. Nomes de tabela/coluna conferidos nas
-- migrations V1/V4/V6/V8/V14/V19/V20. IF NOT EXISTS: idempotente.
-- Sem CONCURRENTLY: o Flyway roda a migration em transação e as tabelas são pequenas (TCC/PME).

-- Lançamentos por cartão (listagem, fatura, conciliação de cartão)
CREATE INDEX IF NOT EXISTS idx_lancamento_cartao_cartao ON tb_lancamento_cartao (cartao_credito_id);

-- Transações por carteira de investimento
CREATE INDEX IF NOT EXISTS idx_transacao_investimento_conta ON tb_transacao_investimento (conta_investimento_id);

-- Contas a pagar/receber: categoria/parceiro (bloqueio de exclusão, relatórios) e o filtro mais
-- comum da tela/dashboard (empresa + status + vencimento)
CREATE INDEX IF NOT EXISTS idx_conta_categoria ON tb_conta (categoria_id);
CREATE INDEX IF NOT EXISTS idx_conta_parceiro ON tb_conta (parceiro_id);
CREATE INDEX IF NOT EXISTS idx_conta_empresa_status_vencimento ON tb_conta (empresa_id, status, data_vencimento);

-- Transferências (origem/destino) — bloqueio de exclusão de conta corrente
CREATE INDEX IF NOT EXISTS idx_transferencia_conta_origem ON tb_transferencia (conta_origem_id);
CREATE INDEX IF NOT EXISTS idx_transferencia_conta_destino ON tb_transferencia (conta_destino_id);

-- Conciliação bancária por conta corrente
CREATE INDEX IF NOT EXISTS idx_conciliacao_conta_corrente ON tb_conciliacao (conta_corrente_id);

-- Baixas por conta corrente (bloqueio de exclusão de conta corrente)
CREATE INDEX IF NOT EXISTS idx_conta_baixada_conta_corrente ON tb_conta_baixada (conta_corrente_id);

-- Assinaturas vinculadas a cartão
CREATE INDEX IF NOT EXISTS idx_assinatura_cartao ON tb_assinatura (cartao_credito_id);

-- Cartões por conta corrente
CREATE INDEX IF NOT EXISTS idx_cartao_credito_conta_corrente ON tb_cartao_credito (conta_corrente_id);

-- RBAC: a PK de tb_perfil_permissao é (perfil_id, permissao_id) — não serve a busca por permissão
CREATE INDEX IF NOT EXISTS idx_perfil_permissao_permissao ON tb_perfil_permissao (permissao_id);

-- Operadores por perfil (bloqueio de exclusão de perfil, cálculo de permissões)
CREATE INDEX IF NOT EXISTS idx_usuario_empresa_perfil ON tb_usuario_empresa (perfil_id);
