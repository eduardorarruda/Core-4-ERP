package br.com.core4erp.cartaoCredito.repository;

import br.com.core4erp.cartaoCredito.entity.CartaoCredito;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CartaoCreditoRepository extends JpaRepository<CartaoCredito, Long> {
    List<CartaoCredito> findAllByUsuarioId(Long usuarioId);
    Optional<CartaoCredito> findByIdAndUsuarioId(Long id, Long usuarioId);
    boolean existsByContaCorrenteIdAndUsuarioId(Long contaCorrenteId, Long usuarioId);
}
