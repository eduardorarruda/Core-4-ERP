package br.com.core4erp.chat.service;

import br.com.core4erp.chat.entity.ChatMensagem;
import br.com.core4erp.chat.repository.ChatMensagemRepository;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Histórico de conversa persistido em banco (fonte da verdade).
 * Substitui o cache em memória, que não sobrevivia a restart nem escalava
 * horizontalmente.
 */
@Service
public class ChatMemoryService {

    /**
     * Intervalo de inatividade que separa "conversas". Mensagens anteriores a um silêncio maior
     * que isto não são carregadas como contexto — evita que uma confirmação ("isso mesmo", "pode
     * registrar") se ancore num assunto antigo e dispare ações indevidas.
     */
    private static final Duration GAP_NOVA_CONVERSA = Duration.ofMinutes(30);

    private final ChatMensagemRepository repository;

    public ChatMemoryService(ChatMensagemRepository repository) {
        this.repository = repository;
    }

    /**
     * Carrega as mensagens da conversa corrente do usuário (limitadas a {@code maxMensagens}),
     * em ordem cronológica, convertidas para mensagens do Spring AI. A conversa corrente é a
     * sequência mais recente sem silêncios maiores que {@link #GAP_NOVA_CONVERSA}.
     */
    @Transactional(readOnly = true)
    public List<Message> carregar(Long usuarioId, int maxMensagens) {
        // Vem em ordem decrescente (mais recente primeiro).
        List<ChatMensagem> recentes = repository.findByUsuarioIdOrderByCriadoEmDescIdDesc(
                usuarioId, PageRequest.of(0, maxMensagens));

        // Se a última interação já é antiga, trata como nova conversa: não carrega contexto algum.
        // Evita que uma confirmação tardia ("isso mesmo") se ancore numa conversa encerrada.
        if (!recentes.isEmpty()
                && Duration.between(recentes.get(0).getCriadoEm(), LocalDateTime.now())
                        .compareTo(GAP_NOVA_CONVERSA) > 0) {
            return new ArrayList<>();
        }

        // Corta no primeiro gap de inatividade, mantendo só a conversa corrente.
        int corte = recentes.size();
        for (int i = 1; i < recentes.size(); i++) {
            Duration intervalo = Duration.between(
                    recentes.get(i).getCriadoEm(), recentes.get(i - 1).getCriadoEm());
            if (intervalo.compareTo(GAP_NOVA_CONVERSA) > 0) {
                corte = i;
                break;
            }
        }

        // Percorremos de trás para frente (até o corte) para obter a ordem cronológica.
        List<Message> mensagens = new ArrayList<>(corte);
        for (int i = corte - 1; i >= 0; i--) {
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
