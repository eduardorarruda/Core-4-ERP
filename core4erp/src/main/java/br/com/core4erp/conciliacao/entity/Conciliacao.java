package br.com.core4erp.conciliacao.entity;

import br.com.core4erp.conciliacao.enums.StatusConciliacao;
import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.contaCorrente.entity.ContaCorrente;
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
@Table(name = "tb_conciliacao")
public class Conciliacao extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDateTime dataConciliacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conta_corrente_id", nullable = false)
    private ContaCorrente contaCorrente;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatusConciliacao status = StatusConciliacao.PENDENTE;

    @Column(length = 20)
    private String bancoId;

    @Column(length = 20)
    private String agencia;

    @Column(length = 50)
    private String numeroContaOfx;

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
