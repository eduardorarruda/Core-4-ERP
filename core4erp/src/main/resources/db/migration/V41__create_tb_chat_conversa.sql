-- Conversas nomeadas do chat (estilo ChatGPT): cada conversa é uma thread própria do usuário,
-- com título e histórico independentes. As mensagens passam a pertencer a uma conversa.

CREATE TABLE tb_chat_conversa (
    id            BIGSERIAL PRIMARY KEY,
    usuario_id    BIGINT       NOT NULL,
    titulo        VARCHAR(120) NOT NULL DEFAULT 'Nova conversa',
    canal         VARCHAR(20)  NOT NULL DEFAULT 'ASSISTENTE',
    arquivada     BOOLEAN      NOT NULL DEFAULT FALSE,
    criado_em     TIMESTAMP    NOT NULL DEFAULT now(),
    atualizado_em TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT fk_chat_conversa_usuario FOREIGN KEY (usuario_id) REFERENCES tb_usuario(id)
);

CREATE INDEX idx_chat_conversa_usuario_canal
    ON tb_chat_conversa (usuario_id, canal, atualizado_em DESC);

ALTER TABLE tb_chat_mensagem ADD COLUMN conversa_id BIGINT;

-- Migração dos dados existentes: 1 conversa por (usuário, canal), preservando tudo.
INSERT INTO tb_chat_conversa (usuario_id, titulo, canal, criado_em, atualizado_em)
SELECT usuario_id, 'Conversa anterior', canal, MIN(criado_em), MAX(criado_em)
FROM tb_chat_mensagem
GROUP BY usuario_id, canal;

UPDATE tb_chat_mensagem m
SET conversa_id = c.id
FROM tb_chat_conversa c
WHERE c.usuario_id = m.usuario_id AND c.canal = m.canal AND m.conversa_id IS NULL;

-- Título da conversa a partir da 1ª mensagem do usuário.
UPDATE tb_chat_conversa c
SET titulo = LEFT(sub.conteudo, 80)
FROM (
    SELECT DISTINCT ON (conversa_id) conversa_id, conteudo
    FROM tb_chat_mensagem
    WHERE role = 'USER'
    ORDER BY conversa_id, criado_em ASC, id ASC
) sub
WHERE sub.conversa_id = c.id AND sub.conteudo IS NOT NULL AND length(trim(sub.conteudo)) > 0;

ALTER TABLE tb_chat_mensagem ALTER COLUMN conversa_id SET NOT NULL;
ALTER TABLE tb_chat_mensagem ADD CONSTRAINT fk_chat_mensagem_conversa
    FOREIGN KEY (conversa_id) REFERENCES tb_chat_conversa(id) ON DELETE CASCADE;

CREATE INDEX idx_chat_mensagem_conversa ON tb_chat_mensagem (conversa_id, criado_em);
