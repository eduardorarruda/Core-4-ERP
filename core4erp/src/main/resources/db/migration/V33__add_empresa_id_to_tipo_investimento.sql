-- Migra tb_tipo_investimento de isolamento por usuário para isolamento por empresa.
-- Cada tipo existente é vinculado à empresa ativa do usuário criador.
-- Registros sem vínculo ativo ficam com empresa_id do primeiro registro disponível.

ALTER TABLE tb_tipo_investimento ADD COLUMN empresa_id BIGINT REFERENCES tb_empresa(id);

UPDATE tb_tipo_investimento t
SET empresa_id = (
    SELECT ue.empresa_id
    FROM tb_usuario_empresa ue
    WHERE ue.usuario_id = t.usuario_id
      AND ue.ativo = true
    ORDER BY ue.id
    LIMIT 1
);

-- Fallback para registros órfãos (caso o usuário não tenha vínculo ativo)
UPDATE tb_tipo_investimento t
SET empresa_id = (
    SELECT ue.empresa_id
    FROM tb_usuario_empresa ue
    WHERE ue.usuario_id = t.usuario_id
    ORDER BY ue.id
    LIMIT 1
)
WHERE empresa_id IS NULL;

ALTER TABLE tb_tipo_investimento ALTER COLUMN empresa_id SET NOT NULL;
