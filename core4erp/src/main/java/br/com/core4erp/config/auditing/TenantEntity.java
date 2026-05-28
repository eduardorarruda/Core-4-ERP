package br.com.core4erp.config.auditing;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import lombok.Setter;

/**
 * Base class para todas as entidades de negócio multi-tenant.
 * Herda os campos de auditoria de {@link Auditable} e adiciona
 * o campo empresa_id, preenchido automaticamente pelo {@link TenantEntityListener}.
 */
@Getter
@Setter
@MappedSuperclass
@EntityListeners(TenantEntityListener.class)
public abstract class TenantEntity extends Auditable {

    @Column(name = "empresa_id", nullable = false)
    private Long empresaId;
}
