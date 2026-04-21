package br.com.core4erp.contaCorrente.repository;

import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface ContaCorrenteRepository extends JpaRepository<ContaCorrente, Long> {
    List<ContaCorrente> findAllByUsuarioId(Long usuarioId);
    Optional<ContaCorrente> findByIdAndUsuarioId(Long id, Long usuarioId);
    boolean existsByNumeroContaAndUsuarioId(String numeroConta, Long usuarioId);

    @Query("SELECT COALESCE(SUM(c.saldo), 0) FROM ContaCorrente c WHERE c.usuario.id = :uid")
    BigDecimal sumSaldoByUsuarioId(@Param("uid") Long uid);
}
