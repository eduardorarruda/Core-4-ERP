package br.com.core4erp.chat.repository;

import br.com.core4erp.chat.entity.RagSync;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;

public interface RagSyncRepository extends JpaRepository<RagSync, Long> {

    Optional<RagSync> findByEmpresaIdAndTipoResumoAndPeriodo(Long empresaId, String tipoResumo, String periodo);

    /** Perfis sem período (periodo IS NULL) — método dedicado evita param nullable em query derivada. */
    Optional<RagSync> findByEmpresaIdAndTipoResumoAndPeriodoIsNull(Long empresaId, String tipoResumo);

    boolean existsByEmpresaIdAndTipoResumo(Long empresaId, String tipoResumo);

    /**
     * Empresas com CONSENTIMENTO para processamento por IA (LGPD art. 7º, I / art. 8º): ao menos um
     * membro ATIVO que aceitou os Termos de Uso e a Política de Privacidade (tb_usuario.termos_aceitos_em, V45).
     */
    @Query("""
            SELECT DISTINCT ue.empresa.id FROM UsuarioEmpresa ue
            WHERE ue.ativo = true AND ue.usuario.termosAceitosEm IS NOT NULL
            """)
    Set<Long> findEmpresaIdsComConsentimento();

    /** Mesmo critério de {@link #findEmpresaIdsComConsentimento()} para uma única empresa. */
    @Query("""
            SELECT CASE WHEN COUNT(ue) > 0 THEN true ELSE false END FROM UsuarioEmpresa ue
            WHERE ue.empresa.id = :empresaId AND ue.ativo = true AND ue.usuario.termosAceitosEm IS NOT NULL
            """)
    boolean empresaTemConsentimento(@Param("empresaId") Long empresaId);

    /** Esquece o estado de sincronização da empresa (re-backfill completo se o consentimento voltar). */
    @Modifying
    @Transactional
    @Query("DELETE FROM RagSync r WHERE r.empresaId = :empresaId")
    int deleteByEmpresaId(@Param("empresaId") Long empresaId);
}
