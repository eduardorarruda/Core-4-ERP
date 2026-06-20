package br.com.core4erp.chat.repository;

import br.com.core4erp.chat.entity.ChatMensagem;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface ChatMensagemRepository extends JpaRepository<ChatMensagem, Long> {

    /**
     * Retorna as mensagens mais recentes do usuário (ordem decrescente).
     * O chamador deve inverter para obter a ordem cronológica.
     */
    List<ChatMensagem> findByUsuarioIdOrderByCriadoEmDescIdDesc(Long usuarioId, Pageable pageable);

    @Modifying
    @Query("DELETE FROM ChatMensagem m WHERE m.usuarioId = :usuarioId")
    void deleteByUsuarioId(Long usuarioId);
}
