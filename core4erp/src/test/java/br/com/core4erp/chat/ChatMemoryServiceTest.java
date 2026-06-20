package br.com.core4erp.chat;

import br.com.core4erp.chat.entity.ChatMensagem;
import br.com.core4erp.chat.repository.ChatMensagemRepository;
import br.com.core4erp.chat.service.ChatMemoryService;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.data.domain.Pageable;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatMemoryServiceTest {

    private final ChatMensagemRepository repository = mock(ChatMensagemRepository.class);
    private final ChatMemoryService service = new ChatMemoryService(repository);

    @Test
    void carregar_inverteParaOrdemCronologicaEMapeiaPapeis() {
        // Repositório retorna em ordem DECRESCENTE (mais recente primeiro)
        ChatMensagem maisRecente = new ChatMensagem(1L, ChatMensagem.Role.ASSISTANT, "resposta");
        ChatMensagem maisAntiga = new ChatMensagem(1L, ChatMensagem.Role.USER, "pergunta");
        when(repository.findByUsuarioIdOrderByCriadoEmDescIdDesc(anyLong(), any(Pageable.class)))
                .thenReturn(List.of(maisRecente, maisAntiga));

        List<Message> mensagens = service.carregar(1L, 20);

        assertEquals(2, mensagens.size());
        // Após inversão: a pergunta (User) vem primeiro, a resposta (Assistant) depois
        assertInstanceOf(UserMessage.class, mensagens.get(0));
        assertInstanceOf(AssistantMessage.class, mensagens.get(1));
        assertEquals("pergunta", mensagens.get(0).getText());
    }

    @Test
    void registrar_conteudoEmBranco_naoPersiste() {
        service.registrar(1L, ChatMensagem.Role.USER, "   ");
        service.registrar(1L, ChatMensagem.Role.USER, null);
        verify(repository, never()).save(any());
    }

    @Test
    void registrar_conteudoValido_persiste() {
        service.registrar(1L, ChatMensagem.Role.ASSISTANT, "ok");
        verify(repository).save(any(ChatMensagem.class));
    }
}
