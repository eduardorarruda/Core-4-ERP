package br.com.core4erp.investimento.repository;

import br.com.core4erp.investimento.entity.ContaInvestimento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ContaInvestimentoRepository extends JpaRepository<ContaInvestimento, Long> {
    List<ContaInvestimento> findAllByEmpresaId(Long empresaId);
    Optional<ContaInvestimento> findByIdAndEmpresaId(Long id, Long empresaId);

    @Query("SELECT COALESCE(SUM(c.saldoAtual), 0) FROM ContaInvestimento c WHERE c.empresaId = :eid")
    BigDecimal sumSaldoAtualByEmpresaId(@Param("eid") Long eid);
}
