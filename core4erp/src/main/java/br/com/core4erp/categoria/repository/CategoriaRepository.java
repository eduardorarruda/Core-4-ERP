package br.com.core4erp.categoria.repository;

import br.com.core4erp.categoria.entity.Categoria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
    List<Categoria> findAllByUsuarioId(Long usuarioId);
    Optional<Categoria> findByIdAndUsuarioId(Long id, Long usuarioId);
}
