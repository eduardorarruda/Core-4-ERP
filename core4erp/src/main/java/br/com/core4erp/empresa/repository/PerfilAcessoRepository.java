package br.com.core4erp.empresa.repository;

import br.com.core4erp.empresa.entity.PerfilAcesso;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PerfilAcessoRepository extends JpaRepository<PerfilAcesso, Long> {

    Optional<PerfilAcesso> findByNome(String nome);
}
