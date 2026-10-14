package br.com.core4erp.orcamento.repository;

import br.com.core4erp.orcamento.entity.Orcamento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface OrcamentoRepository extends JpaRepository<Orcamento, Long> {

    /** Orçamentos ativos da empresa com a categoria já carregada (sem N+1 ao montar a resposta). */
    @Query("""
        SELECT o FROM Orcamento o
        JOIN FETCH o.categoria c
        WHERE o.empresaId = :eid AND o.ativo = true
        """)
    List<Orcamento> findAtivosComCategoria(@Param("eid") Long eid);

    @Query("""
        SELECT o FROM Orcamento o
        JOIN FETCH o.categoria c
        WHERE o.id = :id AND o.empresaId = :eid AND o.ativo = true
        """)
    Optional<Orcamento> findAtivoByIdAndEmpresaId(@Param("id") Long id, @Param("eid") Long eid);

    boolean existsByEmpresaIdAndCategoria_IdAndAtivoTrue(Long empresaId, Long categoriaId);
}
