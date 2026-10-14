package br.com.core4erp.cartaoCredito.entity;

import br.com.core4erp.config.auditing.TenantEntity;
import br.com.core4erp.config.crypto.CampoCriptografadoConverter;
import br.com.core4erp.config.crypto.IndiceCego;
import br.com.core4erp.contaCorrente.entity.ContaCorrente;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@EqualsAndHashCode(of = "id", callSuper = false)
@Getter
@Setter
@Entity
@Table(name = "tb_cartao_credito")
public class CartaoCredito extends TenantEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nome;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal limite;

    @Column(nullable = false)
    private Integer diaFechamento;

    @Column(nullable = false)
    private Integer diaVencimento;

    /** ACCTID do OFX cifrado em repouso. Casamento arquivo → cartão via {@link #acctIdOfxHash}. */
    @Convert(converter = CampoCriptografadoConverter.class)
    @Column(name = "acct_id_ofx", length = 255)
    private String acctIdOfx;

    /** Índice cego (HMAC-SHA256) do ACCTID — UNIQUE (acct_id_ofx_hash, empresa_id) na V51. */
    @Setter(AccessLevel.NONE)
    @Column(name = "acct_id_ofx_hash", length = 64)
    private String acctIdOfxHash;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conta_corrente_id", nullable = false)
    private ContaCorrente contaCorrente;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    /** Mantém o índice cego sempre sincronizado com o ACCTID. */
    public void setAcctIdOfx(String acctIdOfx) {
        this.acctIdOfx = acctIdOfx;
        this.acctIdOfxHash = IndiceCego.acctIdCartao(acctIdOfx);
    }
}
