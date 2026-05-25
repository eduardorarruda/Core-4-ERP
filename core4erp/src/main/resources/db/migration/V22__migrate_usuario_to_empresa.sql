-- Migração: cada usuário existente vira proprietário de sua própria empresa
INSERT INTO tb_empresa (nome, email_contato, created_by, created_date)
SELECT
    COALESCE(nome, email) AS nome,
    email,
    email,
    NOW()
FROM tb_usuario;

-- Associar cada usuário à sua empresa como PROPRIETARIO
INSERT INTO tb_usuario_empresa (usuario_id, empresa_id, perfil_id, data_ingresso)
SELECT
    u.id                                                    AS usuario_id,
    e.id                                                    AS empresa_id,
    (SELECT id FROM tb_perfil_acesso WHERE nome = 'PROPRIETARIO') AS perfil_id,
    NOW()
FROM tb_usuario u
JOIN tb_empresa e ON e.email_contato = u.email;
