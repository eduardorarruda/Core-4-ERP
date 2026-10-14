package br.com.core4erp.config.auditing;

import br.com.core4erp.config.ApplicationContextProvider;
import br.com.core4erp.config.tenant.TenantContext;
import jakarta.persistence.PrePersist;

/**
 * JPA EntityListener que injeta automaticamente o empresa_id do contexto
 * do tenant corrente antes de cada INSERT, evitando violação de NOT NULL.
 */
public class TenantEntityListener {

    @PrePersist
    public void setEmpresaId(TenantEntity entity) {
        if (entity.getEmpresaId() != null) return; // já definido, não sobrescreve
        TenantContext ctx = ApplicationContextProvider.getBean(TenantContext.class);
        if (ctx != null && ctx.getEmpresaId() != null) {
            entity.setEmpresaId(ctx.getEmpresaId());
        }
    }
}
