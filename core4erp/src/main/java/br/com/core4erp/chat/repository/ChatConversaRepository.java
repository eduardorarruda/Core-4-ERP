package br.com.core4erp.chat.repository;

import br.com.core4erp.chat.entity.ChatConversa;
import br.com.core4erp.chat.entity.ChatMensagem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatConversaRepository extends JpaRepository<ChatConversa, Long> {

    /**
     * Conversas do usuário no canal, mais recentes primeiro (para a lista lateral). Limitado às
     * 200 mais recentes — a lista lateral não pagina e uma conta muito antiga não pode devolver
     * milhares de linhas de uma vez.
     */
    List<ChatConversa> findTop200ByUsuarioIdAndCanalOrderByAtualizadoEmDescIdDesc(
            Long usuarioId, ChatMensagem.Canal canal);

    /** A conversa mais recente do canal — usada como "conversa ativa" quando nenhum id é enviado. */
    Optional<ChatConversa> findFirstByUsuarioIdAndCanalOrderByAtualizadoEmDescIdDesc(
            Long usuarioId, ChatMensagem.Canal canal);

    /** Lookup com controle de dono (isolamento por usuário). */
    Optional<ChatConversa> findByIdAndUsuarioId(Long id, Long usuarioId);

    void deleteByUsuarioIdAndCanal(Long usuarioId, ChatMensagem.Canal canal);
}
