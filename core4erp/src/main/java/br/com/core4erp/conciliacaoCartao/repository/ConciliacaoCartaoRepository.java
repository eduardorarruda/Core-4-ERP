package br.com.core4erp.conciliacaoCartao.repository;

import br.com.core4erp.conciliacaoCartao.entity.ConciliacaoCartao;
import br.com.core4erp.conciliacaoCartao.enums.StatusConciliacaoCartao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConciliacaoCartaoRepository extends JpaRepository<ConciliacaoCartao, Long> {

    List<ConciliacaoCartao> findAllByEmpresaIdOrderByDataConciliacaoDesc(Long empresaId);

    Optional<ConciliacaoCartao> findByIdAndEmpresaId(Long id, Long empresaId);

    boolean existsByCartaoCreditoIdAndDataInicioOfxAndDataFimOfxAndStatusNot(
            Long cartaoId,
            java.time.LocalDate dataInicio,
            java.time.LocalDate dataFim,
            StatusConciliacaoCartao status);
}
