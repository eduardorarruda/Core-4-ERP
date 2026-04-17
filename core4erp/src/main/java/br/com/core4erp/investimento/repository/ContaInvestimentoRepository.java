package br.com.core4erp.investimento.repository;

import br.com.core4erp.investimento.entity.ContaInvestimento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ContaInvestimentoRepository extends JpaRepository<ContaInvestimento, Long> {
    List<ContaInvestimento> findAllByUsuarioId(Long usuarioId);
    Optional<ContaInvestimento> findByIdAndUsuarioId(Long id, Long usuarioId);
}
