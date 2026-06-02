package br.com.core4erp.contaCorrente.repository;

import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ContaCorrenteRepository extends JpaRepository<ContaCorrente, Long> {
    List<ContaCorrente> findAllByEmpresaId(Long empresaId);
    Optional<ContaCorrente> findByIdAndEmpresaId(Long id, Long empresaId);
    boolean existsByNumeroContaAndEmpresaId(String numeroConta, Long empresaId);

    Optional<ContaCorrente> findByNumeroContaAndEmpresaId(String numeroConta, Long empresaId);

    @Query("SELECT COALESCE(SUM(c.saldo), 0) FROM ContaCorrente c WHERE c.empresaId = :eid")
    BigDecimal sumSaldoByEmpresaId(@Param("eid") Long eid);
}
