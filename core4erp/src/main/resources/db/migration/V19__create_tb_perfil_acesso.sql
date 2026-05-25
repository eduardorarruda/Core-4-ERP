CREATE TABLE tb_perfil_acesso (
    id          BIGSERIAL PRIMARY KEY,
    nome        VARCHAR(50) NOT NULL UNIQUE,
    descricao   VARCHAR(200)
);

INSERT INTO tb_perfil_acesso (nome, descricao) VALUES
    ('PROPRIETARIO', 'Acesso total. Criador da empresa. Não pode ser removido.'),
    ('ADMIN',        'Acesso total. Gerencia usuários e configurações.'),
    ('FINANCEIRO',   'Acesso total às finanças. Não gerencia usuários.'),
    ('OPERADOR',     'Cria e visualiza lançamentos. Não deleta.'),
    ('VISUALIZADOR', 'Somente leitura em todos os módulos.');

CREATE TABLE tb_permissao (
    id        BIGSERIAL PRIMARY KEY,
    codigo    VARCHAR(60) NOT NULL UNIQUE,
    modulo    VARCHAR(40) NOT NULL,
    acao      VARCHAR(20) NOT NULL,
    descricao VARCHAR(200)
);

INSERT INTO tb_permissao (codigo, modulo, acao, descricao) VALUES
    ('CONTA_VISUALIZAR',           'CONTA',           'VISUALIZAR',    'Ver contas a pagar/receber'),
    ('CONTA_CRIAR',                'CONTA',           'CRIAR',         'Criar contas a pagar/receber'),
    ('CONTA_EDITAR',               'CONTA',           'EDITAR',        'Editar contas a pagar/receber'),
    ('CONTA_DELETAR',              'CONTA',           'DELETAR',       'Deletar contas a pagar/receber'),
    ('CONTA_BAIXAR',               'CONTA',           'BAIXAR',        'Registrar pagamento/recebimento'),
    ('CONTA_ESTORNAR',             'CONTA',           'ESTORNAR',      'Estornar pagamento/recebimento'),
    ('CONTA_CORRENTE_VISUALIZAR',  'CONTA_CORRENTE',  'VISUALIZAR',    'Ver contas correntes'),
    ('CONTA_CORRENTE_CRIAR',       'CONTA_CORRENTE',  'CRIAR',         'Criar conta corrente'),
    ('CONTA_CORRENTE_EDITAR',      'CONTA_CORRENTE',  'EDITAR',        'Editar conta corrente'),
    ('CONTA_CORRENTE_DELETAR',     'CONTA_CORRENTE',  'DELETAR',       'Deletar conta corrente'),
    ('CONTA_CORRENTE_TRANSFERIR',  'CONTA_CORRENTE',  'TRANSFERIR',    'Fazer transferências'),
    ('CARTAO_VISUALIZAR',          'CARTAO',          'VISUALIZAR',    'Ver cartões'),
    ('CARTAO_CRIAR',               'CARTAO',          'CRIAR',         'Criar cartão'),
    ('CARTAO_EDITAR',              'CARTAO',          'EDITAR',        'Editar cartão'),
    ('CARTAO_DELETAR',             'CARTAO',          'DELETAR',       'Deletar cartão'),
    ('CARTAO_LANCAR',              'CARTAO',          'LANCAR',        'Criar lançamento no cartão'),
    ('CARTAO_FECHAR_FATURA',       'CARTAO',          'FECHAR_FATURA', 'Fechar fatura do cartão'),
    ('CATEGORIA_VISUALIZAR',       'CATEGORIA',       'VISUALIZAR',    'Ver categorias'),
    ('CATEGORIA_CRIAR',            'CATEGORIA',       'CRIAR',         'Criar categoria'),
    ('CATEGORIA_EDITAR',           'CATEGORIA',       'EDITAR',        'Editar categoria'),
    ('CATEGORIA_DELETAR',          'CATEGORIA',       'DELETAR',       'Deletar categoria'),
    ('PARCEIRO_VISUALIZAR',        'PARCEIRO',        'VISUALIZAR',    'Ver parceiros'),
    ('PARCEIRO_CRIAR',             'PARCEIRO',        'CRIAR',         'Criar parceiro'),
    ('PARCEIRO_EDITAR',            'PARCEIRO',        'EDITAR',        'Editar parceiro'),
    ('PARCEIRO_DELETAR',           'PARCEIRO',        'DELETAR',       'Deletar parceiro'),
    ('INVESTIMENTO_VISUALIZAR',    'INVESTIMENTO',    'VISUALIZAR',    'Ver investimentos'),
    ('INVESTIMENTO_CRIAR',         'INVESTIMENTO',    'CRIAR',         'Criar investimento'),
    ('INVESTIMENTO_EDITAR',        'INVESTIMENTO',    'EDITAR',        'Editar investimento'),
    ('INVESTIMENTO_DELETAR',       'INVESTIMENTO',    'DELETAR',       'Deletar investimento'),
    ('ASSINATURA_VISUALIZAR',      'ASSINATURA',      'VISUALIZAR',    'Ver assinaturas'),
    ('ASSINATURA_CRIAR',           'ASSINATURA',      'CRIAR',         'Criar assinatura'),
    ('ASSINATURA_EDITAR',          'ASSINATURA',      'EDITAR',        'Editar assinatura'),
    ('ASSINATURA_DELETAR',         'ASSINATURA',      'DELETAR',       'Deletar assinatura'),
    ('CONCILIACAO_VISUALIZAR',     'CONCILIACAO',     'VISUALIZAR',    'Ver conciliações'),
    ('CONCILIACAO_IMPORTAR',       'CONCILIACAO',     'IMPORTAR',      'Importar OFX'),
    ('CONCILIACAO_VINCULAR',       'CONCILIACAO',     'VINCULAR',      'Vincular/recusar itens'),
    ('RELATORIO_EXPORTAR',         'RELATORIO',       'EXPORTAR',      'Gerar e exportar relatórios'),
    ('USUARIO_VISUALIZAR',         'USUARIO',         'VISUALIZAR',    'Ver usuários da empresa'),
    ('USUARIO_CONVIDAR',           'USUARIO',         'CONVIDAR',      'Convidar novos usuários'),
    ('USUARIO_EDITAR',             'USUARIO',         'EDITAR',        'Alterar perfil de usuários'),
    ('USUARIO_REMOVER',            'USUARIO',         'REMOVER',       'Remover usuários da empresa'),
    ('AUDITORIA_VISUALIZAR',       'AUDITORIA',       'VISUALIZAR',    'Ver trilha de auditoria'),
    ('CONFIGURACAO_EDITAR',        'CONFIGURACAO',    'EDITAR',        'Alterar configurações da empresa');

CREATE TABLE tb_perfil_permissao (
    perfil_id    BIGINT NOT NULL REFERENCES tb_perfil_acesso(id),
    permissao_id BIGINT NOT NULL REFERENCES tb_permissao(id),
    PRIMARY KEY (perfil_id, permissao_id)
);

-- PROPRIETARIO e ADMIN têm todas as permissões
INSERT INTO tb_perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id FROM tb_perfil_acesso p CROSS JOIN tb_permissao pm
WHERE p.nome IN ('PROPRIETARIO', 'ADMIN');

-- FINANCEIRO: tudo exceto gestão de usuários e configuração
INSERT INTO tb_perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id FROM tb_perfil_acesso p CROSS JOIN tb_permissao pm
WHERE p.nome = 'FINANCEIRO'
  AND pm.modulo NOT IN ('USUARIO', 'CONFIGURACAO');

-- OPERADOR: visualizar + criar em tudo financeiro, sem deletar
INSERT INTO tb_perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id FROM tb_perfil_acesso p CROSS JOIN tb_permissao pm
WHERE p.nome = 'OPERADOR'
  AND pm.acao IN ('VISUALIZAR', 'CRIAR', 'BAIXAR', 'LANCAR', 'TRANSFERIR', 'VINCULAR')
  AND pm.modulo NOT IN ('USUARIO', 'CONFIGURACAO', 'AUDITORIA');

-- VISUALIZADOR: apenas VISUALIZAR em tudo
INSERT INTO tb_perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id FROM tb_perfil_acesso p CROSS JOIN tb_permissao pm
WHERE p.nome = 'VISUALIZADOR'
  AND pm.acao = 'VISUALIZAR'
  AND pm.modulo NOT IN ('USUARIO', 'CONFIGURACAO', 'AUDITORIA');
