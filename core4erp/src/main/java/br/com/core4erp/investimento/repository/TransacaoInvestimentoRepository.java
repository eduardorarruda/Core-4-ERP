package br.com.core4erp.investimento.repository;

import br.com.core4erp.investimento.entity.TransacaoInvestimento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface TransacaoInvestimentoRepository extends JpaRepository<TransacaoInvestimento, Long> {
    List<TransacaoInvestimento> findAllByContaInvestimentoIdAndUsuarioId(Long contaId, Long usuarioId);
    boolean existsByContaInvestimentoId(Long contaId);

    List<TransacaoInvestimento> findByUsuarioIdAndDataTransacaoBetweenOrderByDataTransacao(
            Long usuarioId, LocalDate inicio, LocalDate fim);

    @Query("SELECT COALESCE(SUM(t.valor), 0) FROM TransacaoInvestimento t " +
           "WHERE t.usuario.id = :uid AND t.tipoTransacao = 'APORTE'")
    BigDecimal sumTotalAportadoByUsuario(@Param("uid") Long uid);

    @Query("SELECT COALESCE(SUM(t.valor), 0) FROM TransacaoInvestimento t " +
           "WHERE t.usuario.id = :uid AND t.tipoTransacao = 'RESGATE'")
    BigDecimal sumTotalResgatadoByUsuario(@Param("uid") Long uid);
}
