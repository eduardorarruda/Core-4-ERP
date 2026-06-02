package br.com.core4erp.cartaoCredito.repository;

import br.com.core4erp.cartaoCredito.entity.LancamentoCartao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface LancamentoCartaoRepository extends JpaRepository<LancamentoCartao, Long> {

    List<LancamentoCartao> findAllByCartaoCreditoIdAndEmpresaId(Long cartaoId, Long empresaId);

    List<LancamentoCartao> findAllByCartaoCreditoIdAndEmpresaIdAndMesFaturaAndAnoFatura(
            Long cartaoId, Long empresaId, Integer mes, Integer ano);

    Optional<LancamentoCartao> findByIdAndCartaoCreditoIdAndEmpresaId(Long id, Long cartaoId, Long empresaId);

    boolean existsByCartaoCreditoId(Long cartaoId);

    boolean existsByAssinaturaIdAndMesFaturaAndAnoFatura(Long assinaturaId, Integer mes, Integer ano);

    @Query("SELECT COALESCE(SUM(l.valor), 0) FROM LancamentoCartao l " +
           "WHERE l.cartaoCredito.id = :cartaoId AND l.anoFatura = :ano AND l.mesFatura = :mes")
    BigDecimal sumValorByCartaoAndFatura(@Param("cartaoId") Long cartaoId,
                                         @Param("ano") Integer ano,
                                         @Param("mes") Integer mes);

    @Query("SELECT COALESCE(SUM(l.valor), 0) FROM LancamentoCartao l " +
           "WHERE l.cartaoCredito.id = :cartaoId " +
           "AND (l.anoFatura * 100 + l.mesFatura) >= (:anoInicio * 100 + :mesInicio) " +
           "AND (l.anoFatura * 100 + l.mesFatura) <= (:anoFim * 100 + :mesFim)")
    BigDecimal sumValorByCartaoAndPeriod(@Param("cartaoId") Long cartaoId,
                                         @Param("mesInicio") Integer mesInicio,
                                         @Param("anoInicio") Integer anoInicio,
                                         @Param("mesFim") Integer mesFim,
                                         @Param("anoFim") Integer anoFim);

    @Query("SELECT COALESCE(SUM(l.valor), 0) FROM LancamentoCartao l " +
           "WHERE l.empresaId = :eid " +
           "AND (l.anoFatura * 100 + l.mesFatura) >= (:anoInicio * 100 + :mesInicio) " +
           "AND (l.anoFatura * 100 + l.mesFatura) <= (:anoFim * 100 + :mesFim)")
    BigDecimal sumValorByEmpresaAndPeriod(@Param("eid") Long eid,
                                          @Param("mesInicio") Integer mesInicio,
                                          @Param("anoInicio") Integer anoInicio,
                                          @Param("mesFim") Integer mesFim,
                                          @Param("anoFim") Integer anoFim);

    @Query("SELECT l FROM LancamentoCartao l " +
           "WHERE l.empresaId = :eid " +
           "AND (l.anoFatura * 100 + l.mesFatura) >= (:anoInicio * 100 + :mesInicio) " +
           "AND (l.anoFatura * 100 + l.mesFatura) <= (:anoFim * 100 + :mesFim) " +
           "ORDER BY l.anoFatura, l.mesFatura, l.dataCompra")
    List<LancamentoCartao> findByEmpresaIdAndFaturaPeriod(@Param("eid") Long eid,
                                                          @Param("mesInicio") Integer mesInicio,
                                                          @Param("anoInicio") Integer anoInicio,
                                                          @Param("mesFim") Integer mesFim,
                                                          @Param("anoFim") Integer anoFim);

    /** Single query returning [cartaoId, sumValor] for a set of cards — avoids N+1 in listar(). */
    @Query("SELECT l.cartaoCredito.id, COALESCE(SUM(l.valor), 0) FROM LancamentoCartao l " +
           "WHERE l.cartaoCredito.id IN :cartaoIds " +
           "AND l.empresaId = :eid " +
           "AND (l.anoFatura * 100 + l.mesFatura) >= (:anoInicio * 100 + :mesInicio) " +
           "AND (l.anoFatura * 100 + l.mesFatura) <= (:anoFim * 100 + :mesFim) " +
           "GROUP BY l.cartaoCredito.id")
    List<Object[]> sumValorByCartaoIdsAndPeriod(@Param("cartaoIds") List<Long> cartaoIds,
                                                @Param("eid") Long eid,
                                                @Param("mesInicio") Integer mesInicio,
                                                @Param("anoInicio") Integer anoInicio,
                                                @Param("mesFim") Integer mesFim,
                                                @Param("anoFim") Integer anoFim);

    @Query("""
        SELECT COALESCE(SUM(l.valor), 0) FROM LancamentoCartao l
        WHERE l.empresaId = :eid
        AND NOT EXISTS (
            SELECT 1 FROM FaturaCartao f
            WHERE f.cartaoCredito.id = l.cartaoCredito.id
            AND f.mes = l.mesFatura AND f.ano = l.anoFatura
            AND f.status = 'FECHADA' AND f.empresaId = :eid
        )
    """)
    BigDecimal sumLancamentosEmFaturasAbertasByEmpresa(@Param("eid") Long eid);

    @Query("""
        SELECT l FROM LancamentoCartao l
        WHERE l.cartaoCredito.id = :cartaoId
        AND l.empresaId = :eid
        AND l.dataCompra BETWEEN :dataMin AND :dataMax
    """)
    List<LancamentoCartao> findCandidatasParaConciliacao(@Param("cartaoId") Long cartaoId,
                                                         @Param("eid") Long eid,
                                                         @Param("dataMin") java.time.LocalDate dataMin,
                                                         @Param("dataMax") java.time.LocalDate dataMax);

    @Query("""
        SELECT l.categoria.descricao, l.mesFatura, l.anoFatura, COALESCE(SUM(l.valor), 0)
        FROM LancamentoCartao l
        WHERE l.empresaId = :eid
        AND (l.anoFatura * 100 + l.mesFatura) >= (:anoInicio * 100 + :mesInicio)
        AND (l.anoFatura * 100 + l.mesFatura) <= (:anoFim * 100 + :mesFim)
        GROUP BY l.categoria.descricao, l.mesFatura, l.anoFatura
        ORDER BY l.anoFatura, l.mesFatura, l.categoria.descricao
    """)
    List<Object[]> resumoDashboardPorCategoria(@Param("eid") Long eid,
                                               @Param("mesInicio") Integer mesInicio,
                                               @Param("anoInicio") Integer anoInicio,
                                               @Param("mesFim") Integer mesFim,
                                               @Param("anoFim") Integer anoFim);
}
