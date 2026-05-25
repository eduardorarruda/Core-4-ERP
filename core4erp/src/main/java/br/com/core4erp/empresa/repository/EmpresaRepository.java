package br.com.core4erp.empresa.repository;

import br.com.core4erp.empresa.entity.Empresa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface EmpresaRepository extends JpaRepository<Empresa, Long> {

    @Query("SELECT e.id FROM Empresa e WHERE e.ativa = true")
    List<Long> findIdsAtivas();
}
