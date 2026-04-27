package br.com.core4erp.conciliacao.entity;

import br.com.core4erp.conciliacao.enums.StatusItemConciliacao;
import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.conta.entity.Conta;
import br.com.core4erp.conta.entity.ContaBaixada;
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
@Table(name = "tb_conciliacao_item")
public class ConciliacaoItem extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conciliacao_id", nullable = false)
    private Conciliacao conciliacao;

    @Column(nullable = false, length = 100)
    private String ofxId;

    @Column(length = 20)
    private String ofxTipo;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal ofxValor;

    @Column(nullable = false)
    private LocalDate ofxData;

    @Column(length = 500)
    private String ofxMemo;

    @Column(length = 255)
    private String ofxNome;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conta_id")
    private Conta conta;

    private Integer scoreVinculacao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatusItemConciliacao statusItem = StatusItemConciliacao.NAO_IDENTIFICADO;

    @Column(nullable = false)
    private Boolean contaCriadaAqui = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conta_baixada_id")
    private ContaBaixada contaBaixada;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
