package br.com.core4erp.chat.repository;

import br.com.core4erp.chat.entity.ChatMensagem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMensagemRepository extends JpaRepository<ChatMensagem, Long> {

    /**
     * Mensagens mais recentes de uma conversa (ordem decrescente).
     * O chamador deve inverter para obter a ordem cronológica.
     */
    List<ChatMensagem> findByConversaIdOrderByCriadoEmDescIdDesc(Long conversaId, Pageable pageable);

    /** Todas as mensagens da conversa, em ordem cronológica (para exibir o histórico completo). */
    List<ChatMensagem> findByConversaIdOrderByCriadoEmAscIdAsc(Long conversaId);
}
