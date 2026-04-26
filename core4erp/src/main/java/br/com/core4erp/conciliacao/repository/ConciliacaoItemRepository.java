package br.com.core4erp.conciliacao.repository;

import br.com.core4erp.conciliacao.entity.ConciliacaoItem;
import br.com.core4erp.conciliacao.enums.StatusItemConciliacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConciliacaoItemRepository extends JpaRepository<ConciliacaoItem, Long> {

    List<ConciliacaoItem> findAllByConciliacaoId(Long conciliacaoId);

    Optional<ConciliacaoItem> findByIdAndConciliacaoId(Long id, Long conciliacaoId);

    boolean existsByConciliacaoIdAndOfxId(Long conciliacaoId, String ofxId);

    List<ConciliacaoItem> findAllByConciliacaoIdAndStatusItemIn(
            Long conciliacaoId, List<StatusItemConciliacao> statuses);
}
