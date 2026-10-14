package br.com.core4erp.empresa.repository;

import br.com.core4erp.empresa.entity.Auditoria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface AuditoriaRepository extends JpaRepository<Auditoria, Long> {

    @Query(value = """
        SELECT * FROM tb_auditoria a
        WHERE a.empresa_id = :empresaId
          AND (CAST(:entidade AS VARCHAR) IS NULL OR a.entidade = :entidade)
          AND (CAST(:entidadeId AS BIGINT) IS NULL OR a.entidade_id = :entidadeId)
          AND (CAST(:acao AS VARCHAR) IS NULL OR a.acao = CAST(:acao AS VARCHAR))
          AND (CAST(:usuarioId AS BIGINT) IS NULL OR a.usuario_id = :usuarioId)
          AND (CAST(:dataInicio AS TIMESTAMP) IS NULL OR a.timestamp >= :dataInicio)
          AND (CAST(:dataFim AS TIMESTAMP) IS NULL OR a.timestamp <= :dataFim)
        """,
        countQuery = """
        SELECT COUNT(*) FROM tb_auditoria a
        WHERE a.empresa_id = :empresaId
          AND (CAST(:entidade AS VARCHAR) IS NULL OR a.entidade = :entidade)
          AND (CAST(:entidadeId AS BIGINT) IS NULL OR a.entidade_id = :entidadeId)
          AND (CAST(:acao AS VARCHAR) IS NULL OR a.acao = CAST(:acao AS VARCHAR))
          AND (CAST(:usuarioId AS BIGINT) IS NULL OR a.usuario_id = :usuarioId)
          AND (CAST(:dataInicio AS TIMESTAMP) IS NULL OR a.timestamp >= :dataInicio)
          AND (CAST(:dataFim AS TIMESTAMP) IS NULL OR a.timestamp <= :dataFim)
        """,
        nativeQuery = true)
    Page<Auditoria> filtrar(
        @Param("empresaId") Long empresaId,
        @Param("entidade") String entidade,
        @Param("entidadeId") Long entidadeId,
        @Param("acao") String acao,
        @Param("usuarioId") Long usuarioId,
        @Param("dataInicio") LocalDateTime dataInicio,
        @Param("dataFim") LocalDateTime dataFim,
        Pageable pageable
    );
}
