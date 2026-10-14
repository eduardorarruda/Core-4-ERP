package br.com.core4erp.conta.repository;

import br.com.core4erp.conta.entity.ContaBaixada;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ContaBaixadaRepository extends JpaRepository<ContaBaixada, Long> {
    boolean existsByContaId(Long contaId);
    // S.3: bloqueia exclusão de conta corrente que já possui baixas vinculadas
    boolean existsByContaCorrenteId(Long contaCorrenteId);
    Optional<ContaBaixada> findByContaId(Long contaId);

    /** Baixas do período com conta, categoria e conta corrente já carregadas (relatórios — sem N+1). */
    @Query("""
            SELECT cb FROM ContaBaixada cb
            JOIN FETCH cb.conta c
            LEFT JOIN FETCH c.categoria
            LEFT JOIN FETCH cb.contaCorrente
            WHERE cb.empresaId = :empresaId
              AND cb.dataPagamento BETWEEN :inicio AND :fim
            ORDER BY cb.dataPagamento
            """)
    List<ContaBaixada> findByEmpresaIdAndDataPagamentoBetweenOrderByDataPagamento(
            @Param("empresaId") Long empresaId, @Param("inicio") LocalDate inicio, @Param("fim") LocalDate fim);

    @Query("SELECT COALESCE(SUM(cb.valorFinal), 0) FROM ContaBaixada cb " +
           "WHERE cb.empresaId = :eid AND cb.conta.tipo = 'PAGAR'")
    BigDecimal sumTotalPagoByEmpresa(@Param("eid") Long eid);

    @Query("SELECT COALESCE(SUM(cb.valorFinal), 0) FROM ContaBaixada cb " +
           "WHERE cb.empresaId = :eid AND cb.conta.tipo = 'RECEBER'")
    BigDecimal sumTotalRecebidoByEmpresa(@Param("eid") Long eid);

    /** Total pago (saídas) por conta corrente — para a IA responder "onde gasto mais". */
    @Query("SELECT cb.contaCorrente.descricao, SUM(cb.valorFinal) FROM ContaBaixada cb " +
           "WHERE cb.empresaId = :eid AND cb.conta.tipo = 'PAGAR' " +
           "GROUP BY cb.contaCorrente.id, cb.contaCorrente.descricao " +
           "ORDER BY SUM(cb.valorFinal) DESC")
    List<Object[]> gastoPorContaCorrente(@Param("eid") Long eid);
}
