package br.com.core4erp.empresa.repository;

import br.com.core4erp.empresa.entity.Permissao;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PermissaoRepository extends JpaRepository<Permissao, Long> {

    @Cacheable("permissoes-sistema")
    List<Permissao> findAll();
}
