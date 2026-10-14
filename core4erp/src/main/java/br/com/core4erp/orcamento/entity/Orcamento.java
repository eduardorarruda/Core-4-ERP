package br.com.core4erp.orcamento.entity;

import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.config.auditing.TenantEntity;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

/**
 * Limite mensal (recorrente) de gasto para uma categoria principal. O gasto realizado é sempre
 * calculado na leitura ({@code GastoRepository}) — nunca persistido aqui.
 */
@EqualsAndHashCode(of = "id", callSuper = false)
@Getter
@Setter
@Entity
@Table(name = "tb_orcamento")
public class Orcamento extends TenantEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    @Column(name = "valor_limite", nullable = false, precision = 15, scale = 2)
    private BigDecimal valorLimite;

    /** Soft delete: excluir um orçamento apenas o inativa. */
    @Column(nullable = false)
    private Boolean ativo = true;

    /** Criador (auditoria) — não é filtro de acesso; o acesso é por {@code empresaId}. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
