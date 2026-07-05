package br.com.core4erp.chat.service;

import br.com.core4erp.chat.entity.ChatMensagem;
import br.com.core4erp.chat.repository.ChatMensagemRepository;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Persistência do histórico do chat, agora por CONVERSA (thread) — estilo ChatGPT. Cada conversa
 * tem seu próprio histórico; o contexto da IA é carregado da conversa corrente, e a tela exibe a
 * conversa completa.
 */
@Service
public class ChatMemoryService {

    /** Nº máximo de mensagens carregadas como contexto da IA. */
    private static final int MAX_MENSAGENS_CONTEXTO = 20;

    /**
     * Teto de tamanho (caracteres) do histórico carregado como contexto. Uma mensagem antiga muito
     * grande (ex.: um anexo) inflava o prompt e estourava o limite de tokens/min da OpenAI (429).
     * Mantemos as mensagens MAIS RECENTES até este teto.
     */
    private static final int MAX_CONTEXTO_CHARS = 8_000;

    private final ChatMensagemRepository repository;

    public ChatMemoryService(ChatMensagemRepository repository) {
        this.repository = repository;
    }

    /** Contexto da IA: mensagens recentes da conversa, em ordem cronológica, com teto de tamanho. */
    @Transactional(readOnly = true)
    public List<Message> carregarContexto(Long conversaId) {
        if (conversaId == null) return List.of();
        // Vem em ordem decrescente (mais recente primeiro).
        List<ChatMensagem> recentes = repository.findByConversaIdOrderByCriadoEmDescIdDesc(
                conversaId, PageRequest.of(0, MAX_MENSAGENS_CONTEXTO));

        // Ordem cronológica.
        List<ChatMensagem> ordenado = new ArrayList<>(recentes.size());
        for (int i = recentes.size() - 1; i >= 0; i--) ordenado.add(recentes.get(i));

        // Mantém só as mensagens mais recentes até MAX_CONTEXTO_CHARS.
        int total = 0, inicio = 0;
        for (int i = ordenado.size() - 1; i >= 0; i--) {
            String c = ordenado.get(i).getConteudo();
            total += c != null ? c.length() : 0;
            if (total > MAX_CONTEXTO_CHARS) { inicio = i + 1; break; }
        }
        List<ChatMensagem> janela = inicio == 0 ? ordenado : ordenado.subList(inicio, ordenado.size());

        return janela.stream()
                .map(m -> m.getRole() == ChatMensagem.Role.USER
                        ? (Message) new UserMessage(m.getConteudo())
                        : new AssistantMessage(m.getConteudo()))
                .toList();
    }

    /** Conversa COMPLETA em ordem cronológica — para o frontend exibir a thread ao abri-la. */
    @Transactional(readOnly = true)
    public List<ChatMensagem> mensagensDaConversa(Long conversaId) {
        if (conversaId == null) return List.of();
        return repository.findByConversaIdOrderByCriadoEmAscIdAsc(conversaId);
    }

    @Transactional
    public void registrar(Long usuarioId, Long conversaId, ChatMensagem.Canal canal,
                          ChatMensagem.Role role, String conteudo) {
        if (conteudo == null || conteudo.isBlank() || conversaId == null) {
            return;
        }
        repository.save(new ChatMensagem(usuarioId, conversaId, canal, role, conteudo));
    }
}
