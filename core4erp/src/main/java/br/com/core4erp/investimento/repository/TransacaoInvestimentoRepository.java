package br.com.core4erp.investimento.repository;

import br.com.core4erp.investimento.entity.TransacaoInvestimento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransacaoInvestimentoRepository extends JpaRepository<TransacaoInvestimento, Long> {
    List<TransacaoInvestimento> findAllByContaInvestimentoIdAndUsuarioId(Long contaId, Long usuarioId);
    boolean existsByContaInvestimentoId(Long contaId);
}
