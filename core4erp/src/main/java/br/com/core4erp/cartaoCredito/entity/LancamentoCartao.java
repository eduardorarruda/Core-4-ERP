package br.com.core4erp.cartaoCredito.entity;

import br.com.core4erp.assinatura.entity.Assinatura;
import br.com.core4erp.cartaoCredito.enums.TipoLancamentoCartao;
import br.com.core4erp.categoria.entity.Categoria;
import br.com.core4erp.config.auditing.TenantEntity;
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
@Table(name = "tb_lancamento_cartao")
public class LancamentoCartao extends TenantEntity {

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

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private TipoLancamentoCartao tipo = TipoLancamentoCartao.SAIDA;

    /** UUID para agrupar parcelas de um mesmo lançamento. */
    private String grupoParcelamento;

    private Integer numeroParcela = 1;

    private Integer totalParcelas = 1;

    /** Marca que a categoria foi sugerida pela IA (a pedido do usuário). */
    @Column(name = "classificado_por_ia", nullable = false)
    private Boolean classificadoPorIa = false;

    /** Confiança (0..1) reportada pela IA na classificação; null se não classificado por IA. */
    @Column(name = "confianca_ia", precision = 5, scale = 4)
    private BigDecimal confiancaIa;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assinatura_id")
    private Assinatura assinatura;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parceiro_id")
    private Parceiro parceiro;

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
