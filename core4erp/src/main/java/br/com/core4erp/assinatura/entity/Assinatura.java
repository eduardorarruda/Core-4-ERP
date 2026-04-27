package br.com.core4erp.assinatura.entity;

import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.parceiro.entity.Parceiro;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@EqualsAndHashCode(of = "id", callSuper = false)
@Getter
@Setter
@Entity
@Table(name = "tb_assinatura")
public class Assinatura extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String descricao;

    @Column(nullable = false, precision = 15, scale = 2)
    private java.math.BigDecimal valor;

    @Column(nullable = false)
    private Integer diaVencimento;

    @Column(nullable = false)
    private Boolean ativa = true;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parceiro_id")
    private Parceiro parceiro;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
