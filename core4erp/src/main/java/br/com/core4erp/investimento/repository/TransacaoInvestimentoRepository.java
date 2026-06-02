package br.com.core4erp.investimento.repository;

import br.com.core4erp.investimento.entity.TransacaoInvestimento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface TransacaoInvestimentoRepository extends JpaRepository<TransacaoInvestimento, Long> {
    List<TransacaoInvestimento> findAllByContaInvestimentoIdAndEmpresaId(Long contaId, Long empresaId);
    boolean existsByContaInvestimentoId(Long contaId);

    List<TransacaoInvestimento> findByEmpresaIdAndDataTransacaoBetweenOrderByDataTransacao(
            Long empresaId, LocalDate inicio, LocalDate fim);

    @Query("SELECT COALESCE(SUM(t.valor), 0) FROM TransacaoInvestimento t " +
           "WHERE t.empresaId = :eid AND t.tipoTransacao = 'APORTE'")
    BigDecimal sumTotalAportadoByEmpresa(@Param("eid") Long eid);

    @Query("SELECT COALESCE(SUM(t.valor), 0) FROM TransacaoInvestimento t " +
           "WHERE t.empresaId = :eid AND t.tipoTransacao = 'RESGATE'")
    BigDecimal sumTotalResgatadoByEmpresa(@Param("eid") Long eid);
}
