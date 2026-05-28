package br.com.core4erp.empresa.repository;

import br.com.core4erp.empresa.entity.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface EmpresaRepository extends JpaRepository<Empresa, Long> {

    @Query("SELECT e.id FROM Empresa e WHERE e.ativa = true")
    List<Long> findIdsAtivas();

    @Query("SELECT e FROM Empresa e LEFT JOIN FETCH e.plano WHERE e.id = :id")
    Optional<Empresa> findByIdComPlano(@Param("id") Long id);
}
