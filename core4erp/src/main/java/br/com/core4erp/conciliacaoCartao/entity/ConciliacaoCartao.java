package br.com.core4erp.conciliacaoCartao.entity;

import br.com.core4erp.cartaoCredito.entity.CartaoCredito;
import br.com.core4erp.conciliacaoCartao.enums.StatusConciliacaoCartao;
import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@EqualsAndHashCode(of = "id", callSuper = false)
@Getter
@Setter
@Entity
@Table(name = "tb_conciliacao_cartao")
public class ConciliacaoCartao extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime dataConciliacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cartao_credito_id", nullable = false)
    private CartaoCredito cartaoCredito;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private StatusConciliacaoCartao status = StatusConciliacaoCartao.PENDENTE;

    @Column(length = 100)
    private String acctIdOfx;

    private LocalDate dataInicioOfx;

    private LocalDate dataFimOfx;

    @Column(nullable = false)
    private Integer totalTransacoes = 0;

    @Column(nullable = false)
    private Integer totalConciliados = 0;

    @Column(nullable = false)
    private Integer totalNaoIdentificados = 0;

    @Column(length = 500)
    private String observacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
