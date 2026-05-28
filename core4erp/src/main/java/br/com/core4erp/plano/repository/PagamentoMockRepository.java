package br.com.core4erp.plano.repository;

import br.com.core4erp.plano.entity.PagamentoMock;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PagamentoMockRepository extends JpaRepository<PagamentoMock, Long> {

    List<PagamentoMock> findByEmpresaIdOrderByCreatedDateDesc(Long empresaId);

    Page<PagamentoMock> findByEmpresaIdOrderByCreatedDateDesc(Long empresaId, Pageable pageable);

    Optional<PagamentoMock> findTopByEmpresaIdAndStatusOrderByCreatedDateDesc(
            Long empresaId, PagamentoMock.StatusPagamento status);
}
