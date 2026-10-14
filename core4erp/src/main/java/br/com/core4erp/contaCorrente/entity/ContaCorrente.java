package br.com.core4erp.contaCorrente.entity;

import br.com.core4erp.config.auditing.TenantEntity;
import br.com.core4erp.config.crypto.CampoCriptografadoConverter;
import br.com.core4erp.config.crypto.IndiceCego;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;

@EqualsAndHashCode(of = "id", callSuper = false)
@Getter
@Setter
@Entity
@Table(name = "tb_conta_corrente")
public class ContaCorrente extends TenantEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // S.12: lock otimista — evita lost update do saldo em baixas/transferências/conciliações concorrentes
    @Version
    @Column(nullable = false)
    private Long version;

    /** Número da conta cifrado em repouso. Busca/unicidade por empresa via {@link #numeroContaHash}. */
    @Convert(converter = CampoCriptografadoConverter.class)
    @Column(name = "numero_conta", length = 255)
    private String numeroConta;

    /** Índice cego (HMAC-SHA256) do número da conta — UNIQUE (numero_conta_hash, empresa_id) na V47. */
    @Setter(AccessLevel.NONE)
    @Column(name = "numero_conta_hash", length = 64)
    private String numeroContaHash;

    /** Agência cifrada em repouso (não é pesquisada). */
    @Convert(converter = CampoCriptografadoConverter.class)
    @Column(name = "agencia", length = 255)
    private String agencia;

    @Column(nullable = false)
    private String descricao;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal saldo = BigDecimal.ZERO;

    @Column(nullable = false)
    private LocalDate dataSaldoInicial;

    @Column(nullable = false)
    private Boolean permitirSaldoNegativo = false;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    /** Mantém o índice cego sempre sincronizado com o número da conta. */
    public void setNumeroConta(String numeroConta) {
        this.numeroConta = numeroConta;
        this.numeroContaHash = IndiceCego.numeroConta(numeroConta);
    }
}
