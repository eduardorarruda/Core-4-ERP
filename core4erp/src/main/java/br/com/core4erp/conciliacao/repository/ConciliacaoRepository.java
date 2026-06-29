package br.com.core4erp.conciliacao.repository;

import br.com.core4erp.conciliacao.entity.Conciliacao;
import br.com.core4erp.conciliacao.enums.StatusConciliacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConciliacaoRepository extends JpaRepository<Conciliacao, Long> {

    List<Conciliacao> findAllByEmpresaIdOrderByDataConciliacaoDesc(Long empresaId);

    Optional<Conciliacao> findByIdAndEmpresaId(Long id, Long empresaId);

    boolean existsByIdAndEmpresaIdAndStatus(Long id, Long empresaId, StatusConciliacao status);

    // S.3: bloqueia exclusão de conta corrente que já possui conciliações vinculadas
    boolean existsByContaCorrenteId(Long contaCorrenteId);
}
