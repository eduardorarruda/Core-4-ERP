package br.com.core4erp.cartaoCredito.repository;

import br.com.core4erp.cartaoCredito.entity.LancamentoCartao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface LancamentoCartaoRepository extends JpaRepository<LancamentoCartao, Long> {

    List<LancamentoCartao> findAllByCartaoCreditoIdAndUsuarioId(Long cartaoId, Long usuarioId);

    List<LancamentoCartao> findAllByCartaoCreditoIdAndUsuarioIdAndMesFaturaAndAnoFatura(
            Long cartaoId, Long usuarioId, Integer mes, Integer ano);

    Optional<LancamentoCartao> findByIdAndCartaoCreditoIdAndUsuarioId(Long id, Long cartaoId, Long usuarioId);

    boolean existsByCartaoCreditoId(Long cartaoId);

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
}
