package br.com.core4erp.contaCorrente.repository;

import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContaCorrenteRepository extends JpaRepository<ContaCorrente, Long> {
    List<ContaCorrente> findAllByUsuarioId(Long usuarioId);
    Optional<ContaCorrente> findByIdAndUsuarioId(Long id, Long usuarioId);
}
