package br.com.core4erp.chat.repository;

import br.com.core4erp.chat.entity.ChatAuditoria;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatAuditoriaRepository extends JpaRepository<ChatAuditoria, Long> {
}
