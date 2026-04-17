package br.com.core4erp.conta.repository;

import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.TipoConta;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ContaRepository extends JpaRepository<Conta, Long> {

    Page<Conta> findAllByUsuarioId(Long usuarioId, Pageable pageable);

    Page<Conta> findAllByUsuarioIdAndTipo(Long usuarioId, TipoConta tipo, Pageable pageable);

    Page<Conta> findAllByUsuarioIdAndStatus(Long usuarioId, StatusConta status, Pageable pageable);

    Optional<Conta> findByIdAndUsuarioId(Long id, Long usuarioId);

    /** Para sincronização de status ATRASADO. */
    List<Conta> findByUsuarioIdAndStatusAndDataVencimentoBefore(
            Long usuarioId, StatusConta status, LocalDate data);
}
