package br.com.core4erp.conciliacao.repository;

import br.com.core4erp.conciliacao.entity.ConciliacaoItem;
import br.com.core4erp.conciliacao.enums.StatusItemConciliacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface ConciliacaoItemRepository extends JpaRepository<ConciliacaoItem, Long> {

    List<ConciliacaoItem> findAllByConciliacaoId(Long conciliacaoId);

    Optional<ConciliacaoItem> findByIdAndConciliacaoId(Long id, Long conciliacaoId);

    /** ofxIds já registrados na conciliação — carregados uma vez (evita 1 query por transação). */
    @Query("SELECT i.ofxId FROM ConciliacaoItem i WHERE i.conciliacao.id = :conciliacaoId AND i.ofxId IS NOT NULL")
    Set<String> findOfxIdsByConciliacaoId(@Param("conciliacaoId") Long conciliacaoId);

    List<ConciliacaoItem> findAllByConciliacaoIdAndStatusItemIn(
            Long conciliacaoId, List<StatusItemConciliacao> statuses);
}
