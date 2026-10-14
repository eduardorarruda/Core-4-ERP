package br.com.core4erp.conciliacaoCartao.repository;

import br.com.core4erp.conciliacaoCartao.entity.ConciliacaoCartaoItem;
import br.com.core4erp.conciliacaoCartao.enums.StatusItemConciliacaoCartao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface ConciliacaoCartaoItemRepository extends JpaRepository<ConciliacaoCartaoItem, Long> {

    List<ConciliacaoCartaoItem> findAllByConciliacaoCartaoId(Long conciliacaoCartaoId);

    Optional<ConciliacaoCartaoItem> findByIdAndConciliacaoCartaoId(Long id, Long conciliacaoCartaoId);

    /** ofxIds já registrados na conciliação — carregados uma vez (evita 1 query por transação). */
    @Query("SELECT i.ofxId FROM ConciliacaoCartaoItem i WHERE i.conciliacaoCartao.id = :id AND i.ofxId IS NOT NULL")
    Set<String> findOfxIdsByConciliacaoCartaoId(@Param("id") Long conciliacaoCartaoId);

    List<ConciliacaoCartaoItem> findAllByConciliacaoCartaoIdAndStatusItemIn(
            Long conciliacaoCartaoId, List<StatusItemConciliacaoCartao> statuses);
}
