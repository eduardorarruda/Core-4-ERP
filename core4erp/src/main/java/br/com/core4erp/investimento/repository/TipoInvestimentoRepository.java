package br.com.core4erp.investimento.repository;

import br.com.core4erp.investimento.entity.TipoInvestimentoCustom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TipoInvestimentoRepository extends JpaRepository<TipoInvestimentoCustom, Long> {
    List<TipoInvestimentoCustom> findAllByUsuarioId(Long usuarioId);
    Optional<TipoInvestimentoCustom> findByIdAndUsuarioId(Long id, Long usuarioId);
}
