package br.com.core4erp.cartaoCredito.entity;

import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.enums.StatusFatura;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@EqualsAndHashCode(of = "id", callSuper = false)
@Getter
@Setter
@Entity
@Table(name = "tb_fatura_cartao",
        uniqueConstraints = @UniqueConstraint(columnNames = {"cartao_credito_id", "mes", "ano", "usuario_id"}))
public class FaturaCartao extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cartao_credito_id", nullable = false)
    private CartaoCredito cartaoCredito;

    @Column(nullable = false)
    private Integer mes;

    @Column(nullable = false)
    private Integer ano;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private StatusFatura status = StatusFatura.ABERTA;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conta_id")
    private Conta conta;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
