-- Controle incremental da vetorização (RAG): registra o que já foi sincronizado por empresa e
-- período, com hash do conteúdo (evita re-embedding sem mudança) e doc_id determinístico no Qdrant.
CREATE TABLE tb_rag_sync (
    id            BIGSERIAL PRIMARY KEY,
    empresa_id    BIGINT      NOT NULL REFERENCES tb_empresa(id),
    tipo_resumo   VARCHAR(40) NOT NULL,          -- RESUMO_MENSAL | PERFIL_CATEGORIAS | PERFIL_PARCEIROS
    periodo       VARCHAR(7),                    -- 'YYYY-MM' (null p/ perfis sem período)
    hash_conteudo VARCHAR(64) NOT NULL,          -- SHA-256 do texto
    doc_id        VARCHAR(80) NOT NULL,          -- id determinístico do ponto no Qdrant (upsert)
    sincronizado_em TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT uq_rag_sync UNIQUE (empresa_id, tipo_resumo, periodo)
);
CREATE INDEX idx_rag_sync_empresa ON tb_rag_sync (empresa_id);
