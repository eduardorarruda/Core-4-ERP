package br.com.core4erp.cartaoCredito.entity;

import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "tb_lancamento_cartao")
public class LancamentoCartao extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String descricao;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal valor;

    @Column(nullable = false)
    private LocalDate dataCompra;

    @Column(nullable = false)
    private Integer mesFatura;

    @Column(nullable = false)
    private Integer anoFatura;

    /** UUID para agrupar parcelas de um mesmo lançamento. */
    private String grupoParcelamento;

    private Integer numeroParcela = 1;

    private Integer totalParcelas = 1;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cartao_credito_id", nullable = false)
    private CartaoCredito cartaoCredito;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "categoria_id", nullable = false)
    private Categoria categoria;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
