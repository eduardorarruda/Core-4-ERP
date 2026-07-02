package br.com.core4erp.chat.repository;

import br.com.core4erp.chat.entity.ChatMensagem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ChatMensagemRepository extends JpaRepository<ChatMensagem, Long> {

    /**
     * Retorna as mensagens mais recentes do usuário no canal (ordem decrescente).
     * O chamador deve inverter para obter a ordem cronológica.
     */
    List<ChatMensagem> findByUsuarioIdAndCanalOrderByCriadoEmDescIdDesc(
            Long usuarioId, ChatMensagem.Canal canal, Pageable pageable);

    @Modifying
    @Query("DELETE FROM ChatMensagem m WHERE m.usuarioId = :usuarioId AND m.canal = :canal")
    void deleteByUsuarioIdAndCanal(Long usuarioId, ChatMensagem.Canal canal);
}
