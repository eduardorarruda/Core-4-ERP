package br.com.core4erp.conciliacaoCartao.repository;

import br.com.core4erp.conciliacaoCartao.entity.ConciliacaoCartaoItem;
import br.com.core4erp.conciliacaoCartao.enums.StatusItemConciliacaoCartao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConciliacaoCartaoItemRepository extends JpaRepository<ConciliacaoCartaoItem, Long> {

    List<ConciliacaoCartaoItem> findAllByConciliacaoCartaoId(Long conciliacaoCartaoId);

    Optional<ConciliacaoCartaoItem> findByIdAndConciliacaoCartaoId(Long id, Long conciliacaoCartaoId);

    boolean existsByConciliacaoCartaoIdAndOfxId(Long conciliacaoCartaoId, String ofxId);

    List<ConciliacaoCartaoItem> findAllByConciliacaoCartaoIdAndStatusItemIn(
            Long conciliacaoCartaoId, List<StatusItemConciliacaoCartao> statuses);
}
