package br.com.core4erp.categoria.repository;

import br.com.core4erp.categoria.entity.Categoria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
    List<Categoria> findAllByEmpresaId(Long empresaId);
    Page<Categoria> findAllByEmpresaId(Long empresaId, Pageable pageable);
    Optional<Categoria> findByIdAndEmpresaId(Long id, Long empresaId);
}
