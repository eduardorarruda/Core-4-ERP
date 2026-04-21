package br.com.core4erp.parceiro.repository;

import br.com.core4erp.parceiro.entity.Parceiro;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ParceiroRepository extends JpaRepository<Parceiro, Long> {
    List<Parceiro> findAllByUsuarioId(Long usuarioId);
    Page<Parceiro> findAllByUsuarioId(Long usuarioId, Pageable pageable);
    Optional<Parceiro> findByIdAndUsuarioId(Long id, Long usuarioId);
}
