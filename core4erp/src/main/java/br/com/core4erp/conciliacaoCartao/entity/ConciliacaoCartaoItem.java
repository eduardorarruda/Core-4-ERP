package br.com.core4erp.conciliacaoCartao.entity;

import br.com.core4erp.cartaoCredito.entity.LancamentoCartao;
import br.com.core4erp.conciliacaoCartao.enums.StatusItemConciliacaoCartao;
import br.com.core4erp.config.auditing.Auditable;
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
@Table(name = "tb_conciliacao_cartao_item")
public class ConciliacaoCartaoItem extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conciliacao_cartao_id", nullable = false)
    private ConciliacaoCartao conciliacaoCartao;

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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lancamento_id")
    private LancamentoCartao lancamento;

    private Integer scoreVinculacao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private StatusItemConciliacaoCartao statusItem = StatusItemConciliacaoCartao.NAO_IDENTIFICADO;

    @Column(nullable = false)
    private Boolean lancamentoCriadoAqui = false;

    @Column(nullable = false)
    private Boolean lancamentoBaixado = false;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
