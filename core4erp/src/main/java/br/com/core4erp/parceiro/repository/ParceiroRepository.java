package br.com.core4erp.parceiro.repository;

import br.com.core4erp.parceiro.entity.Parceiro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ParceiroRepository extends JpaRepository<Parceiro, Long> {
    List<Parceiro> findAllByEmpresaId(Long empresaId);
    Page<Parceiro> findAllByEmpresaId(Long empresaId, Pageable pageable);
    Optional<Parceiro> findByIdAndEmpresaId(Long id, Long empresaId);
    boolean existsByCpfCnpjAndEmpresaId(String cpfCnpj, Long empresaId);
    boolean existsByCpfCnpjAndEmpresaIdAndIdNot(String cpfCnpj, Long empresaId, Long id);

    /** Busca global: razão social, nome fantasia ou CPF/CNPJ contendo o termo. */
    @Query("""
            SELECT p FROM Parceiro p
            WHERE p.empresaId = :eid
              AND (LOWER(p.razaoSocial) LIKE LOWER(CONCAT('%', :q, '%'))
                OR LOWER(p.nomeFantasia) LIKE LOWER(CONCAT('%', :q, '%'))
                OR p.cpfCnpj LIKE CONCAT('%', :q, '%'))
            """)
    List<Parceiro> buscar(@Param("eid") Long eid, @Param("q") String q, Pageable pageable);
}
