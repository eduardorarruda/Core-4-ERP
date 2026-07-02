-- Isolamento de contexto do chat por superfície (tela Assistente x balão flutuante):
-- cada mensagem pertence a um canal; o histórico/contexto da IA é carregado por canal.
ALTER TABLE tb_chat_mensagem
    ADD COLUMN IF NOT EXISTS canal VARCHAR(20) NOT NULL DEFAULT 'ASSISTENTE';

CREATE INDEX IF NOT EXISTS idx_chat_mensagem_usuario_canal
    ON tb_chat_mensagem (usuario_id, canal, criado_em DESC);

-- Rastreabilidade: marca na auditoria as alterações executadas pela IA (a pedido do usuário),
-- para a tela de auditoria exibir "Ação executada pela IA a pedido do utilizador X".
ALTER TABLE tb_auditoria
    ADD COLUMN IF NOT EXISTS is_ai_action BOOLEAN NOT NULL DEFAULT FALSE;
