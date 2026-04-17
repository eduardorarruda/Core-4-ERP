package br.com.core4erp.notificacao.repository;

import br.com.core4erp.enums.TipoNotificacao;
import br.com.core4erp.notificacao.entity.Notificacao;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NotificacaoRepository extends JpaRepository<Notificacao, Long> {

    List<Notificacao> findByUsuarioIdAndLidaFalseOrderByDataCriacaoDesc(Long usuarioId);

    Optional<Notificacao> findByIdAndUsuarioId(Long id, Long usuarioId);

    boolean existsByUsuarioIdAndTipoAndReferenciaId(Long usuarioId, TipoNotificacao tipo, Long referenciaId);

    /** Deduplicação de FATURA: evita notificar a mesma fatura (referenciaId = cartaoId) duas vezes no mesmo mês. */
    @Query("SELECT COUNT(n) > 0 FROM Notificacao n WHERE n.usuario.id = :uid " +
           "AND n.tipo = 'FATURA' AND n.referenciaId = :cartaoId " +
           "AND n.dataCriacao >= :inicio AND n.dataCriacao <= :fim")
    boolean existsFaturaNotificacao(@Param("uid") Long uid,
                                     @Param("cartaoId") Long cartaoId,
                                     @Param("inicio") java.time.LocalDateTime inicio,
                                     @Param("fim") java.time.LocalDateTime fim);
}
