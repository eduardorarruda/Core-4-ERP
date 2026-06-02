package br.com.core4erp.empresa.repository;

import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

public interface UsuarioEmpresaRepository extends JpaRepository<UsuarioEmpresa, Long> {

    // EntityGraph para evitar N+1 no TenantFilter — carrega perfil + permissões em uma query
    @EntityGraph(attributePaths = {"perfil", "perfil.permissoes", "usuario"})
    Optional<UsuarioEmpresa> findByUsuario_EmailAndEmpresaId(String email, Long empresaId);

    Optional<UsuarioEmpresa> findByUsuarioIdAndEmpresaIdAndAtivoTrue(Long usuarioId, Long empresaId);

    Optional<UsuarioEmpresa> findByUsuarioIdAndEmpresaId(Long usuarioId, Long empresaId);

    List<UsuarioEmpresa> findByUsuario_EmailAndAtivoTrue(String email);

    List<UsuarioEmpresa> findByEmpresaIdAndAtivoTrue(Long empresaId);

    Page<UsuarioEmpresa> findByEmpresaIdAndAtivoTrue(Long empresaId, Pageable pageable);

    boolean existsByUsuarioIdAndEmpresaId(Long usuarioId, Long empresaId);

    long countByEmpresaIdAndAtivoTrue(Long empresaId);

    @EntityGraph(attributePaths = {"usuario", "perfil", "perfil.permissoes"})
    Page<UsuarioEmpresa> findByEmpresaId(Long empresaId, Pageable pageable);
}
