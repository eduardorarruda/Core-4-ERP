package br.com.core4erp.cartaoCredito.repository;

import br.com.core4erp.cartaoCredito.entity.FaturaCartao;
import br.com.core4erp.enums.StatusFatura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface FaturaCartaoRepository extends JpaRepository<FaturaCartao, Long> {

    Optional<FaturaCartao> findByCartaoCreditoIdAndMesAndAnoAndUsuarioId(
            Long cartaoCreditoId, Integer mes, Integer ano, Long usuarioId);

    List<FaturaCartao> findAllByCartaoCreditoIdAndUsuarioId(Long cartaoCreditoId, Long usuarioId);

    Optional<FaturaCartao> findByContaId(Long contaId);

    boolean existsByCartaoCreditoIdAndMesAndAnoAndUsuarioIdAndStatus(
            Long cartaoCreditoId, Integer mes, Integer ano, Long usuarioId, StatusFatura status);

    @Query("""
        SELECT COALESCE(SUM(c.valorOriginal), 0) FROM FaturaCartao f
        JOIN f.conta c
        WHERE f.usuario.id = :uid AND f.status = 'FECHADA'
        AND c.status IN ('PENDENTE', 'ATRASADO')
    """)
    BigDecimal sumFaturasFechadasPendentesByUsuario(@Param("uid") Long uid);
}
