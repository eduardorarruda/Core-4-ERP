-- Perfis do sistema (PROPRIETARIO, ADMIN, etc.) ficam com empresa_id = NULL (global)
-- Perfis criados por usuários terão empresa_id preenchido
ALTER TABLE tb_perfil_acesso ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);

-- Remove a UNIQUE global de nome — incompatível com isolamento por empresa
ALTER TABLE tb_perfil_acesso DROP CONSTRAINT tb_perfil_acesso_nome_key;

-- Perfis do sistema: nome único globalmente
CREATE UNIQUE INDEX uq_perfil_nome_sistema
    ON tb_perfil_acesso (nome) WHERE empresa_id IS NULL;

-- Perfis customizados: nome único por empresa
CREATE UNIQUE INDEX uq_perfil_nome_empresa
    ON tb_perfil_acesso (nome, empresa_id) WHERE empresa_id IS NOT NULL;
