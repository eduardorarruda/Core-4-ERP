package br.com.core4erp.conta.repository;

import br.com.core4erp.conta.entity.ContaBaixada;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ContaBaixadaRepository extends JpaRepository<ContaBaixada, Long> {
    boolean existsByContaId(Long contaId);
    Optional<ContaBaixada> findByContaId(Long contaId);

    List<ContaBaixada> findByUsuarioIdAndDataPagamentoBetweenOrderByDataPagamento(
            Long usuarioId, LocalDate inicio, LocalDate fim);
}
