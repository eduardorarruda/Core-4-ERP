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
 * Histórico de conversa persistido em banco (fonte da verdade).
 * Substitui o cache em memória, que não sobrevivia a restart nem escalava
 * horizontalmente.
 */
@Service
public class ChatMemoryService {

    private final ChatMensagemRepository repository;

    public ChatMemoryService(ChatMensagemRepository repository) {
        this.repository = repository;
    }

    /**
     * Carrega as últimas {@code maxMensagens} mensagens do usuário em ordem cronológica,
     * convertidas para mensagens do Spring AI.
     */
    @Transactional(readOnly = true)
    public List<Message> carregar(Long usuarioId, int maxMensagens) {
        List<ChatMensagem> recentes = repository.findByUsuarioIdOrderByCriadoEmDescIdDesc(
                usuarioId, PageRequest.of(0, maxMensagens));
        // Vem em ordem decrescente; percorremos de trás para frente para obter
        // a ordem cronológica sem mutar a lista retornada pelo repositório.
        List<Message> mensagens = new ArrayList<>(recentes.size());
        for (int i = recentes.size() - 1; i >= 0; i--) {
            ChatMensagem m = recentes.get(i);
            mensagens.add(m.getRole() == ChatMensagem.Role.USER
                    ? new UserMessage(m.getConteudo())
                    : new AssistantMessage(m.getConteudo()));
        }
        return mensagens;
    }

    @Transactional
    public void registrar(Long usuarioId, ChatMensagem.Role role, String conteudo) {
        if (conteudo == null || conteudo.isBlank()) {
            return;
        }
        repository.save(new ChatMensagem(usuarioId, role, conteudo));
    }

    @Transactional
    public void limpar(Long usuarioId) {
        repository.deleteByUsuarioId(usuarioId);
    }
}
