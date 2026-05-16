package br.com.core4erp.contaCorrente.repository;

import br.com.core4erp.contaCorrente.entity.Transferencia;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TransferenciaRepository extends JpaRepository<Transferencia, Long> {

    List<Transferencia> findAllByUsuarioIdOrderByDataTransferenciaDesc(Long usuarioId);

    Optional<Transferencia> findByIdAndUsuarioId(Long id, Long usuarioId);
}
