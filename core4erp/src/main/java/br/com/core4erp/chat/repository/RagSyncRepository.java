package br.com.core4erp.chat.repository;

import br.com.core4erp.chat.entity.RagSync;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RagSyncRepository extends JpaRepository<RagSync, Long> {

    Optional<RagSync> findByEmpresaIdAndTipoResumoAndPeriodo(Long empresaId, String tipoResumo, String periodo);

    /** Perfis sem período (periodo IS NULL) — método dedicado evita param nullable em query derivada. */
    Optional<RagSync> findByEmpresaIdAndTipoResumoAndPeriodoIsNull(Long empresaId, String tipoResumo);

    boolean existsByEmpresaIdAndTipoResumo(Long empresaId, String tipoResumo);
}
