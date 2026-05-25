package br.com.core4erp.empresa.repository;

import br.com.core4erp.empresa.entity.UsuarioEmpresaPermissao;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UsuarioEmpresaPermissaoRepository extends JpaRepository<UsuarioEmpresaPermissao, Long> {

    List<UsuarioEmpresaPermissao> findByUsuarioIdAndEmpresaId(Long usuarioId, Long empresaId);

    Optional<UsuarioEmpresaPermissao> findByUsuarioIdAndEmpresaIdAndPermissaoId(
        Long usuarioId, Long empresaId, Long permissaoId);

    void deleteByUsuarioIdAndEmpresaIdAndPermissaoId(Long usuarioId, Long empresaId, Long permissaoId);

    boolean existsByUsuarioIdAndEmpresaIdAndPermissaoId(Long usuarioId, Long empresaId, Long permissaoId);
}
