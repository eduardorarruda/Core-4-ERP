package br.com.core4erp.parceiro.repository;

import br.com.core4erp.parceiro.entity.Parceiro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ParceiroRepository extends JpaRepository<Parceiro, Long> {
    List<Parceiro> findAllByEmpresaId(Long empresaId);
    Page<Parceiro> findAllByEmpresaId(Long empresaId, Pageable pageable);
    Optional<Parceiro> findByIdAndEmpresaId(Long id, Long empresaId);
    boolean existsByCpfCnpjAndEmpresaId(String cpfCnpj, Long empresaId);
    boolean existsByCpfCnpjAndEmpresaIdAndIdNot(String cpfCnpj, Long empresaId, Long id);
}
