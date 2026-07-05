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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ChatMemoryServiceTest {

    private static final ChatMensagem.Canal CANAL = ChatMensagem.Canal.ASSISTENTE;
    private static final long CONVERSA = 7L;

    private final ChatMensagemRepository repository = mock(ChatMensagemRepository.class);
    private final ChatMemoryService service = new ChatMemoryService(repository);

    @Test
    void carregarContexto_inverteParaOrdemCronologicaEMapeiaPapeis() {
        // Repositório retorna em ordem DECRESCENTE (mais recente primeiro)
        ChatMensagem maisRecente = new ChatMensagem(1L, CONVERSA, CANAL, ChatMensagem.Role.ASSISTANT, "resposta");
        ChatMensagem maisAntiga = new ChatMensagem(1L, CONVERSA, CANAL, ChatMensagem.Role.USER, "pergunta");
        when(repository.findByConversaIdOrderByCriadoEmDescIdDesc(eq(CONVERSA), any(Pageable.class)))
                .thenReturn(List.of(maisRecente, maisAntiga));

        List<Message> mensagens = service.carregarContexto(CONVERSA);

        assertEquals(2, mensagens.size());
        // Após inversão: a pergunta (User) vem primeiro, a resposta (Assistant) depois
        assertInstanceOf(UserMessage.class, mensagens.get(0));
        assertInstanceOf(AssistantMessage.class, mensagens.get(1));
        assertEquals("pergunta", mensagens.get(0).getText());
    }

    @Test
    void carregarContexto_conversaNula_retornaVazioSemConsultar() {
        assertEquals(List.of(), service.carregarContexto(null));
        verify(repository, never()).findByConversaIdOrderByCriadoEmDescIdDesc(anyLong(), any(Pageable.class));
    }

    @Test
    void registrar_conteudoEmBranco_naoPersiste() {
        service.registrar(1L, CONVERSA, CANAL, ChatMensagem.Role.USER, "   ");
        service.registrar(1L, CONVERSA, CANAL, ChatMensagem.Role.USER, null);
        verify(repository, never()).save(any());
    }

    @Test
    void registrar_semConversa_naoPersiste() {
        service.registrar(1L, null, CANAL, ChatMensagem.Role.USER, "oi");
        verify(repository, never()).save(any());
    }

    @Test
    void registrar_conteudoValido_persiste() {
        service.registrar(1L, CONVERSA, CANAL, ChatMensagem.Role.ASSISTANT, "ok");
        verify(repository).save(any(ChatMensagem.class));
    }
}
