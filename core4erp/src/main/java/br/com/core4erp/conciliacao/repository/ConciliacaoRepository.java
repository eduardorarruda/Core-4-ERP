package br.com.core4erp.conciliacao.repository;

import br.com.core4erp.conciliacao.entity.Conciliacao;
import br.com.core4erp.conciliacao.enums.StatusConciliacao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ConciliacaoRepository extends JpaRepository<Conciliacao, Long> {

    List<Conciliacao> findAllByUsuarioIdOrderByDataConciliacaoDesc(Long usuarioId);

    Optional<Conciliacao> findByIdAndUsuarioId(Long id, Long usuarioId);

    boolean existsByIdAndUsuarioIdAndStatus(Long id, Long usuarioId, StatusConciliacao status);
}
