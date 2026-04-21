package br.com.core4erp.cartaoCredito.repository;

import br.com.core4erp.cartaoCredito.entity.FaturaCartao;
import br.com.core4erp.enums.StatusFatura;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FaturaCartaoRepository extends JpaRepository<FaturaCartao, Long> {

    Optional<FaturaCartao> findByCartaoCreditoIdAndMesAndAnoAndUsuarioId(
            Long cartaoCreditoId, Integer mes, Integer ano, Long usuarioId);

    List<FaturaCartao> findAllByCartaoCreditoIdAndUsuarioId(Long cartaoCreditoId, Long usuarioId);

    Optional<FaturaCartao> findByContaId(Long contaId);

    boolean existsByCartaoCreditoIdAndMesAndAnoAndUsuarioIdAndStatus(
            Long cartaoCreditoId, Integer mes, Integer ano, Long usuarioId, StatusFatura status);
}
