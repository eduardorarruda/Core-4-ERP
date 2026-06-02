package br.com.core4erp.empresa.repository;

import br.com.core4erp.empresa.entity.PerfilAcesso;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PerfilAcessoRepository extends JpaRepository<PerfilAcesso, Long> {

    Optional<PerfilAcesso> findByNome(String nome);

    @Query("SELECT p FROM PerfilAcesso p WHERE p.empresaId IS NULL OR p.empresaId = :empresaId")
    List<PerfilAcesso> findAllGlobalOrByEmpresaId(@Param("empresaId") Long empresaId);

    boolean existsByNomeAndEmpresaIdIsNull(String nome);

    boolean existsByNomeAndEmpresaId(String nome, Long empresaId);
}
