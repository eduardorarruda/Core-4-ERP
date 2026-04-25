package br.com.core4erp.conta.repository;

import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.TipoConta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ContaRepository extends JpaRepository<Conta, Long> {

    Page<Conta> findAllByUsuarioId(Long usuarioId, Pageable pageable);

    Page<Conta> findAllByUsuarioIdAndTipo(Long usuarioId, TipoConta tipo, Pageable pageable);

    Page<Conta> findAllByUsuarioIdAndStatus(Long usuarioId, StatusConta status, Pageable pageable);

    Optional<Conta> findByIdAndUsuarioId(Long id, Long usuarioId);

    /** Para sincronização de status ATRASADO. */
    List<Conta> findByUsuarioIdAndStatusAndDataVencimentoBefore(
            Long usuarioId, StatusConta status, LocalDate data);

    List<Conta> findByUsuarioIdAndStatusInAndDataVencimentoBetweenOrderByDataVencimento(
            Long usuarioId, Collection<StatusConta> statuses, LocalDate inicio, LocalDate fim);

    // ── Dashboard queries ─────────────────────────────────────────────────────

    @Query("SELECT COALESCE(SUM(c.valorOriginal), 0) FROM Conta c " +
           "WHERE c.usuario.id = :uid AND c.tipo = :tipo AND c.status IN :statuses")
    BigDecimal sumByTipoAndStatus(@Param("uid") Long uid,
                                  @Param("tipo") TipoConta tipo,
                                  @Param("statuses") Collection<StatusConta> statuses);

    @Query("""
        SELECT EXTRACT(MONTH FROM c.dataVencimento) AS mes,
               EXTRACT(YEAR  FROM c.dataVencimento) AS ano,
               COALESCE(SUM(CASE WHEN c.status = :statusPago     THEN c.valorOriginal ELSE 0 END), 0) AS totalPago,
               COALESCE(SUM(CASE WHEN c.status = :statusRecebido THEN c.valorOriginal ELSE 0 END), 0) AS totalRecebido
        FROM Conta c
        WHERE c.usuario.id = :uid
          AND c.dataVencimento BETWEEN :inicio AND :fim
          AND c.status IN :statuses
        GROUP BY EXTRACT(YEAR FROM c.dataVencimento), EXTRACT(MONTH FROM c.dataVencimento)
        ORDER BY EXTRACT(YEAR FROM c.dataVencimento) ASC, EXTRACT(MONTH FROM c.dataVencimento) ASC
        """)
    List<FluxoMensalProjection> fluxoMensal(@Param("uid") Long uid,
                                             @Param("inicio") LocalDate inicio,
                                             @Param("fim") LocalDate fim,
                                             @Param("statusPago") StatusConta statusPago,
                                             @Param("statusRecebido") StatusConta statusRecebido,
                                             @Param("statuses") Collection<StatusConta> statuses);

    @Query("""
        SELECT c.categoria.descricao AS categoria, SUM(c.valorOriginal) AS total
        FROM Conta c
        WHERE c.usuario.id = :uid
          AND c.tipo = :tipo
          AND c.status IN :statuses
          AND EXTRACT(MONTH FROM c.dataVencimento) = :mes
          AND EXTRACT(YEAR  FROM c.dataVencimento) = :ano
        GROUP BY c.categoria.descricao
        ORDER BY SUM(c.valorOriginal) DESC
        """)
    List<DespesaCategoriaProjection> despesasPorCategoria(@Param("uid") Long uid,
                                                           @Param("tipo") TipoConta tipo,
                                                           @Param("statuses") Collection<StatusConta> statuses,
                                                           @Param("mes") int mes,
                                                           @Param("ano") int ano,
                                                           Pageable pageable);

    @Query("SELECT COUNT(c) FROM Conta c " +
           "WHERE c.usuario.id = :uid AND c.status IN :statuses AND c.dataVencimento = :data")
    Long countByStatusAndData(@Param("uid") Long uid,
                               @Param("statuses") Collection<StatusConta> statuses,
                               @Param("data") LocalDate data);

    @Query("SELECT COUNT(c) FROM Conta c " +
           "WHERE c.usuario.id = :uid AND c.status IN :statuses AND c.dataVencimento < :data")
    Long countByStatusAndDataBefore(@Param("uid") Long uid,
                                    @Param("statuses") Collection<StatusConta> statuses,
                                    @Param("data") LocalDate data);

    // ── Projection interfaces ─────────────────────────────────────────────────

    interface FluxoMensalProjection {
        Integer getMes();
        Integer getAno();
        BigDecimal getTotalPago();
        BigDecimal getTotalRecebido();
    }

    interface DespesaCategoriaProjection {
        String getCategoria();
        BigDecimal getTotal();
    }
}

