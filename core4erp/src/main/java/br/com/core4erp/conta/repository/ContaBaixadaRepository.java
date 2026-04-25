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
    Optional<ContaBaixada> findByContaId(Long contaId);

    List<ContaBaixada> findByUsuarioIdAndDataPagamentoBetweenOrderByDataPagamento(
            Long usuarioId, LocalDate inicio, LocalDate fim);

    @Query("SELECT COALESCE(SUM(cb.valorFinal), 0) FROM ContaBaixada cb " +
           "WHERE cb.usuario.id = :uid AND cb.conta.tipo = 'PAGAR'")
    BigDecimal sumTotalPagoByUsuario(@Param("uid") Long uid);

    @Query("SELECT COALESCE(SUM(cb.valorFinal), 0) FROM ContaBaixada cb " +
           "WHERE cb.usuario.id = :uid AND cb.conta.tipo = 'RECEBER'")
    BigDecimal sumTotalRecebidoByUsuario(@Param("uid") Long uid);
}
