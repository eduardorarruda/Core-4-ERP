-- V31: Permissões granulares por relatório, tipos de investimento e dashboard

INSERT INTO tb_permissao (codigo, modulo, acao, descricao) VALUES
    ('RELATORIO_FLUXO_CAIXA_VISUALIZAR',         'RELATORIO_FLUXO_CAIXA',        'VISUALIZAR', 'Visualizar relatório de fluxo de caixa'),
    ('RELATORIO_FLUXO_CAIXA_EXPORTAR',            'RELATORIO_FLUXO_CAIXA',        'EXPORTAR',   'Exportar relatório de fluxo de caixa'),
    ('RELATORIO_CONTAS_ABERTAS_VISUALIZAR',       'RELATORIO_CONTAS_ABERTAS',     'VISUALIZAR', 'Visualizar relatório de contas abertas'),
    ('RELATORIO_CONTAS_ABERTAS_EXPORTAR',         'RELATORIO_CONTAS_ABERTAS',     'EXPORTAR',   'Exportar relatório de contas abertas'),
    ('RELATORIO_EXTRATO_VISUALIZAR',              'RELATORIO_EXTRATO',            'VISUALIZAR', 'Visualizar extrato financeiro'),
    ('RELATORIO_EXTRATO_EXPORTAR',                'RELATORIO_EXTRATO',            'EXPORTAR',   'Exportar extrato financeiro'),
    ('RELATORIO_DRE_VISUALIZAR',                  'RELATORIO_DRE',                'VISUALIZAR', 'Visualizar DRE'),
    ('RELATORIO_DRE_EXPORTAR',                    'RELATORIO_DRE',                'EXPORTAR',   'Exportar DRE'),
    ('RELATORIO_INVESTIMENTOS_VISUALIZAR',        'RELATORIO_INVESTIMENTOS',      'VISUALIZAR', 'Visualizar relatório de investimentos'),
    ('RELATORIO_INVESTIMENTOS_EXPORTAR',          'RELATORIO_INVESTIMENTOS',      'EXPORTAR',   'Exportar relatório de investimentos'),
    ('RELATORIO_CARTOES_VISUALIZAR',              'RELATORIO_CARTOES',            'VISUALIZAR', 'Visualizar relatório de cartões'),
    ('RELATORIO_CARTOES_EXPORTAR',                'RELATORIO_CARTOES',            'EXPORTAR',   'Exportar relatório de cartões'),
    ('RELATORIO_POSICAO_FINANCEIRA_VISUALIZAR',   'RELATORIO_POSICAO_FINANCEIRA', 'VISUALIZAR', 'Visualizar posição financeira'),
    ('RELATORIO_POSICAO_FINANCEIRA_EXPORTAR',     'RELATORIO_POSICAO_FINANCEIRA', 'EXPORTAR',   'Exportar posição financeira'),
    ('RELATORIO_ASSINATURAS_VISUALIZAR',          'RELATORIO_ASSINATURAS',        'VISUALIZAR', 'Visualizar relatório de assinaturas'),
    ('RELATORIO_ASSINATURAS_EXPORTAR',            'RELATORIO_ASSINATURAS',        'EXPORTAR',   'Exportar relatório de assinaturas'),
    ('INVESTIMENTO_TIPO_GERENCIAR',               'INVESTIMENTO',                 'TIPO_GERENCIAR', 'Criar, editar e remover tipos de investimento'),
    ('DASHBOARD_VISUALIZAR',                      'DASHBOARD',                    'VISUALIZAR', 'Visualizar dashboard geral'),
    ('DASHBOARD_CARTAO_VISUALIZAR',               'DASHBOARD_CARTAO',             'VISUALIZAR', 'Visualizar dashboard de cartões');

-- RELATORIO_*_VISUALIZAR: todos os perfis
INSERT INTO tb_perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id FROM tb_perfil_acesso p CROSS JOIN tb_permissao pm
WHERE pm.codigo IN (
    'RELATORIO_FLUXO_CAIXA_VISUALIZAR',
    'RELATORIO_CONTAS_ABERTAS_VISUALIZAR',
    'RELATORIO_EXTRATO_VISUALIZAR',
    'RELATORIO_DRE_VISUALIZAR',
    'RELATORIO_INVESTIMENTOS_VISUALIZAR',
    'RELATORIO_CARTOES_VISUALIZAR',
    'RELATORIO_POSICAO_FINANCEIRA_VISUALIZAR',
    'RELATORIO_ASSINATURAS_VISUALIZAR'
)
AND p.nome IN ('PROPRIETARIO','ADMIN','FINANCEIRO','OPERADOR','VISUALIZADOR');

-- RELATORIO_*_EXPORTAR: PROPRIETARIO, ADMIN, FINANCEIRO
INSERT INTO tb_perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id FROM tb_perfil_acesso p CROSS JOIN tb_permissao pm
WHERE pm.codigo IN (
    'RELATORIO_FLUXO_CAIXA_EXPORTAR',
    'RELATORIO_CONTAS_ABERTAS_EXPORTAR',
    'RELATORIO_EXTRATO_EXPORTAR',
    'RELATORIO_DRE_EXPORTAR',
    'RELATORIO_INVESTIMENTOS_EXPORTAR',
    'RELATORIO_CARTOES_EXPORTAR',
    'RELATORIO_POSICAO_FINANCEIRA_EXPORTAR',
    'RELATORIO_ASSINATURAS_EXPORTAR'
)
AND p.nome IN ('PROPRIETARIO','ADMIN','FINANCEIRO');

-- INVESTIMENTO_TIPO_GERENCIAR: PROPRIETARIO, ADMIN, FINANCEIRO
INSERT INTO tb_perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id FROM tb_perfil_acesso p CROSS JOIN tb_permissao pm
WHERE pm.codigo = 'INVESTIMENTO_TIPO_GERENCIAR'
  AND p.nome IN ('PROPRIETARIO','ADMIN','FINANCEIRO');

-- DASHBOARD_VISUALIZAR: todos os perfis
INSERT INTO tb_perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id FROM tb_perfil_acesso p CROSS JOIN tb_permissao pm
WHERE pm.codigo = 'DASHBOARD_VISUALIZAR'
  AND p.nome IN ('PROPRIETARIO','ADMIN','FINANCEIRO','OPERADOR','VISUALIZADOR');

-- DASHBOARD_CARTAO_VISUALIZAR: todos os perfis
INSERT INTO tb_perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id FROM tb_perfil_acesso p CROSS JOIN tb_permissao pm
WHERE pm.codigo = 'DASHBOARD_CARTAO_VISUALIZAR'
  AND p.nome IN ('PROPRIETARIO','ADMIN','FINANCEIRO','OPERADOR','VISUALIZADOR');
