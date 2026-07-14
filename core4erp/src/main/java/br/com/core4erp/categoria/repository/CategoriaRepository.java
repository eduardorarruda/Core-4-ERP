package br.com.core4erp.categoria.repository;

import br.com.core4erp.categoria.entity.Categoria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CategoriaRepository extends JpaRepository<Categoria, Long> {
    // EntityGraph carrega a categoria-pai junto — evita N+1 ao montar o DTO (que lê pai.descricao).
    @EntityGraph(attributePaths = "categoriaPai")
    List<Categoria> findAllByEmpresaId(Long empresaId);

    @EntityGraph(attributePaths = "categoriaPai")
    Page<Categoria> findAllByEmpresaId(Long empresaId, Pageable pageable);

    Optional<Categoria> findByIdAndEmpresaId(Long id, Long empresaId);

    /** Categorias ativas da empresa — usado pelo classificador de IA e pelos dropdowns. */
    List<Categoria> findByEmpresaIdAndAtivoTrue(Long empresaId);

    /** Filhas diretas de uma categoria (cascata de inativação / verificação de subníveis). */
    List<Categoria> findByCategoriaPai_IdAndEmpresaId(Long categoriaPaiId, Long empresaId);

    boolean existsByCategoriaPai_IdAndEmpresaId(Long categoriaPaiId, Long empresaId);

    // Nome duplicado no MESMO nível: dois métodos separados evitam a armadilha do parâmetro
    // nullable em JPQL (PostgreSQL não infere tipo de :param IS NULL — ver CLAUDE.md §14).
    boolean existsByEmpresaIdAndDescricaoIgnoreCaseAndCategoriaPaiIsNullAndIdNot(
            Long empresaId, String descricao, Long id);

    boolean existsByEmpresaIdAndDescricaoIgnoreCaseAndCategoriaPai_IdAndIdNot(
            Long empresaId, String descricao, Long categoriaPaiId, Long id);
}
