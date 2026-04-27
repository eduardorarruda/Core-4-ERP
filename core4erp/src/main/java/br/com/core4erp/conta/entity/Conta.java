package br.com.core4erp.conta.entity;

import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.enums.StatusConta;
import br.com.core4erp.enums.TipoConta;
import br.com.core4erp.parceiro.entity.Parceiro;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@EqualsAndHashCode(of = "id", callSuper = false)
@Getter
@Setter
@Entity
@Table(name = "tb_conta")
public class Conta extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String descricao;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal valorOriginal;

    @Column(nullable = false)
    private LocalDate dataVencimento;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TipoConta tipo;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private StatusConta status = StatusConta.PENDENTE;

    private String numeroDocumento;

    @Column(precision = 15, scale = 2)
    private BigDecimal acrescimo = BigDecimal.ZERO;

    @Column(precision = 15, scale = 2)
    private BigDecimal desconto = BigDecimal.ZERO;

    /** UUID para agrupar parcelas geradas em lote. */
    private String grupoParcelamento;

    @Column(nullable = false)
    private Integer numeroParcela = 1;

    @Column(nullable = false)
    private Integer totalParcelas = 1;

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
