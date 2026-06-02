-- V30: Adiciona permissões para Calendário e Conciliação de Cartão

INSERT INTO tb_permissao (codigo, modulo, acao, descricao) VALUES
    ('CALENDARIO_VISUALIZAR',         'CALENDARIO',        'VISUALIZAR', 'Ver calendário financeiro'),
    ('CARTAO_CONCILIACAO_VISUALIZAR', 'CARTAO_CONCILIACAO','VISUALIZAR', 'Ver conciliação de cartão'),
    ('CARTAO_CONCILIACAO_IMPORTAR',   'CARTAO_CONCILIACAO','IMPORTAR',   'Importar OFX de cartão'),
    ('CARTAO_CONCILIACAO_VINCULAR',   'CARTAO_CONCILIACAO','VINCULAR',   'Vincular itens de conciliação de cartão');

-- CALENDARIO_VISUALIZAR: todos os perfis base
INSERT INTO tb_perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM tb_perfil_acesso p CROSS JOIN tb_permissao pm
WHERE pm.codigo = 'CALENDARIO_VISUALIZAR'
  AND p.nome IN ('PROPRIETARIO','ADMIN','FINANCEIRO','OPERADOR','VISUALIZADOR');

-- CARTAO_CONCILIACAO_VISUALIZAR: todos os perfis base
INSERT INTO tb_perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM tb_perfil_acesso p CROSS JOIN tb_permissao pm
WHERE pm.codigo = 'CARTAO_CONCILIACAO_VISUALIZAR'
  AND p.nome IN ('PROPRIETARIO','ADMIN','FINANCEIRO','OPERADOR','VISUALIZADOR');

-- CARTAO_CONCILIACAO_IMPORTAR: PROPRIETARIO, ADMIN e FINANCEIRO
INSERT INTO tb_perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM tb_perfil_acesso p CROSS JOIN tb_permissao pm
WHERE pm.codigo = 'CARTAO_CONCILIACAO_IMPORTAR'
  AND p.nome IN ('PROPRIETARIO','ADMIN','FINANCEIRO');

-- CARTAO_CONCILIACAO_VINCULAR: PROPRIETARIO, ADMIN, FINANCEIRO e OPERADOR
INSERT INTO tb_perfil_permissao (perfil_id, permissao_id)
SELECT p.id, pm.id
FROM tb_perfil_acesso p CROSS JOIN tb_permissao pm
WHERE pm.codigo = 'CARTAO_CONCILIACAO_VINCULAR'
  AND p.nome IN ('PROPRIETARIO','ADMIN','FINANCEIRO','OPERADOR');
