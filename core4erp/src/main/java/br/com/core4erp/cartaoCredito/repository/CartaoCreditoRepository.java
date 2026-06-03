package br.com.core4erp.cartaoCredito.repository;

import br.com.core4erp.cartaoCredito.entity.CartaoCredito;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface CartaoCreditoRepository extends JpaRepository<CartaoCredito, Long> {
    List<CartaoCredito> findAllByEmpresaId(Long empresaId);
    Page<CartaoCredito> findAllByEmpresaId(Long empresaId, Pageable pageable);
    Optional<CartaoCredito> findByIdAndEmpresaId(Long id, Long empresaId);
    boolean existsByContaCorrenteIdAndEmpresaId(Long contaCorrenteId, Long empresaId);

    @Query("SELECT COALESCE(SUM(c.limite), 0) FROM CartaoCredito c WHERE c.empresaId = :eid")
    BigDecimal sumLimiteByEmpresaId(@Param("eid") Long eid);

    @Query("SELECT c.nome, c.limite FROM CartaoCredito c WHERE c.empresaId = :eid")
    List<Object[]> limitesPorCartao(@Param("eid") Long eid);

    Optional<CartaoCredito> findByAcctIdOfxAndEmpresaId(String acctIdOfx, Long empresaId);
}
