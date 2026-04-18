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
    List<CartaoCredito> findAllByUsuarioId(Long usuarioId);
    Page<CartaoCredito> findAllByUsuarioId(Long usuarioId, Pageable pageable);
    Optional<CartaoCredito> findByIdAndUsuarioId(Long id, Long usuarioId);
    boolean existsByContaCorrenteIdAndUsuarioId(Long contaCorrenteId, Long usuarioId);

    @Query("SELECT COALESCE(SUM(c.limite), 0) FROM CartaoCredito c WHERE c.usuario.id = :uid")
    BigDecimal sumLimiteByUsuarioId(@Param("uid") Long uid);
}
