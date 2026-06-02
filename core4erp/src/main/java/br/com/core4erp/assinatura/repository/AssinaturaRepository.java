package br.com.core4erp.assinatura.repository;

import br.com.core4erp.assinatura.entity.Assinatura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface AssinaturaRepository extends JpaRepository<Assinatura, Long> {

    List<Assinatura> findAllByEmpresaId(Long empresaId);

    Optional<Assinatura> findByIdAndEmpresaId(Long id, Long empresaId);

    List<Assinatura> findAllByEmpresaIdAndAtiva(Long empresaId, boolean ativa);

    List<Assinatura> findAllByEmpresaIdAndAtivaAndCartaoCreditoIsNotNull(Long empresaId, boolean ativa);

    @Query("SELECT COALESCE(SUM(a.valor), 0) FROM Assinatura a WHERE a.empresaId = :eid AND a.ativa = true")
    BigDecimal sumValorAtivasByEmpresaId(@Param("eid") Long eid);
}
