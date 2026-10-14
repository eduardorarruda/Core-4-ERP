-- Subcategorias: auto-relacionamento em tb_categoria (máx. 2 níveis, validado no service).
-- Soft delete: tb_categoria passa a ter flag `ativo` (regra CLAUDE.md §16 — categoria em uso
-- por conta/lançamento nunca é removida fisicamente).
ALTER TABLE tb_categoria
    ADD COLUMN categoria_pai_id BIGINT,
    ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE tb_categoria
    ADD CONSTRAINT fk_categoria_pai FOREIGN KEY (categoria_pai_id) REFERENCES tb_categoria(id);

CREATE INDEX idx_categoria_pai ON tb_categoria (categoria_pai_id);
CREATE INDEX idx_categoria_empresa_ativo ON tb_categoria (empresa_id, ativo);

-- Uma categoria não pode ser pai de si mesma (ciclos maiores são bloqueados no service).
ALTER TABLE tb_categoria
    ADD CONSTRAINT ck_categoria_nao_e_propria_pai
    CHECK (categoria_pai_id IS NULL OR categoria_pai_id <> id);
