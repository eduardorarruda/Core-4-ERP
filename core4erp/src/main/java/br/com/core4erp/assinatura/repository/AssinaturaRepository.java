package br.com.core4erp.assinatura.repository;

import br.com.core4erp.assinatura.entity.Assinatura;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface AssinaturaRepository extends JpaRepository<Assinatura, Long> {

    List<Assinatura> findAllByUsuarioId(Long usuarioId);

    Optional<Assinatura> findByIdAndUsuarioId(Long id, Long usuarioId);

    List<Assinatura> findAllByUsuarioIdAndAtiva(Long usuarioId, boolean ativa);

    List<Assinatura> findAllByUsuarioIdAndAtivaAndCartaoCreditoIsNotNull(Long usuarioId, boolean ativa);

    @Query("SELECT COALESCE(SUM(a.valor), 0) FROM Assinatura a WHERE a.usuario.id = :uid AND a.ativa = true")
    BigDecimal sumValorAtivasByUsuarioId(@Param("uid") Long uid);
}
