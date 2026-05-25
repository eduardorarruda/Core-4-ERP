package br.com.core4erp.empresa.repository;

import br.com.core4erp.empresa.entity.AcaoAuditoria;
import br.com.core4erp.empresa.entity.Auditoria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AuditoriaRepository extends JpaRepository<Auditoria, Long> {

    @Query("""
        SELECT a FROM Auditoria a
        WHERE a.empresaId = :empresaId
          AND (:entidade IS NULL OR a.entidade = :entidade)
          AND (:entidadeId IS NULL OR a.entidadeId = :entidadeId)
          AND (:acao IS NULL OR a.acao = :acao)
          AND (:usuarioId IS NULL OR a.usuarioId = :usuarioId)
          AND (:dataInicio IS NULL OR a.timestamp >= :dataInicio)
          AND (:dataFim IS NULL OR a.timestamp <= :dataFim)
        ORDER BY a.timestamp DESC
        """)
    Page<Auditoria> filtrar(
        @Param("empresaId") Long empresaId,
        @Param("entidade") String entidade,
        @Param("entidadeId") Long entidadeId,
        @Param("acao") AcaoAuditoria acao,
        @Param("usuarioId") Long usuarioId,
        @Param("dataInicio") LocalDateTime dataInicio,
        @Param("dataFim") LocalDateTime dataFim,
        Pageable pageable
    );
}
