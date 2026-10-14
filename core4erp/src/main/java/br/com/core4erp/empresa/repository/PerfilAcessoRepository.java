package br.com.core4erp.empresa.repository;

import br.com.core4erp.empresa.entity.PerfilAcesso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PerfilAcessoRepository extends JpaRepository<PerfilAcesso, Long> {

    Optional<PerfilAcesso> findByNome(String nome);

    /** Perfil do SISTEMA pelo nome (perfis customizados de empresas podem repetir nomes). */
    Optional<PerfilAcesso> findByNomeAndEmpresaIdIsNull(String nome);

    @Query("SELECT p FROM PerfilAcesso p WHERE p.empresaId IS NULL OR p.empresaId = :empresaId")
    List<PerfilAcesso> findAllGlobalOrByEmpresaId(@Param("empresaId") Long empresaId);

    boolean existsByNomeAndEmpresaIdIsNull(String nome);

    boolean existsByNomeAndEmpresaId(String nome, Long empresaId);

    boolean existsByNomeAndEmpresaIdAndIdNot(String nome, Long empresaId, Long id);

    /**
     * Perfil que PODE ser atribuído na empresa: do sistema (empresa_id NULL) ou customizado da
     * própria empresa. Nunca usar {@code findById} ao atribuir perfil — permitiria usar o perfil
     * customizado de outra empresa (cross-tenant).
     * <p>Atenção: o nome derivado {@code findByIdAndEmpresaIdOrEmpresaIdIsNull} seria interpretado
     * como {@code (id AND empresaId) OR empresaId IS NULL} — por isso a query explícita.
     */
    @Query("SELECT p FROM PerfilAcesso p WHERE p.id = :id AND (p.empresaId IS NULL OR p.empresaId = :empresaId)")
    Optional<PerfilAcesso> findAtribuivelNaEmpresa(@Param("id") Long id, @Param("empresaId") Long empresaId);
}
