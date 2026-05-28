package br.com.core4erp.plano.repository;

import br.com.core4erp.plano.entity.Plano;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlanoRepository extends JpaRepository<Plano, Long> {

    List<Plano> findByAtivoTrue();

    Optional<Plano> findByNome(String nome);
}
