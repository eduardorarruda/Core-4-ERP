package br.com.core4erp.categoria.entity;

import br.com.core4erp.config.auditing.TenantEntity;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@EqualsAndHashCode(of = "id", callSuper = false)
@Getter
@Setter
@Entity
@Table(name = "tb_categoria")
public class Categoria extends TenantEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String descricao;

    private String icone;

    /**
     * Categoria-pai (self-FK). {@code null} = categoria raiz; preenchido = subcategoria.
     * Hierarquia limitada a 2 níveis — a validação de que o pai não é ele próprio uma
     * subcategoria fica no {@code CategoriaService} (o banco só garante que não é pai de si mesma).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "categoria_pai_id")
    private Categoria categoriaPai;

    /** Soft delete: categoria em uso nunca é removida fisicamente, apenas inativada. */
    @Column(nullable = false)
    private Boolean ativo = true;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
