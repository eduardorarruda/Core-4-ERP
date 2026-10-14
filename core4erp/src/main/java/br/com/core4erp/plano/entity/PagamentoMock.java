package br.com.core4erp.plano.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "tb_pagamento_mock")
@Getter
@Setter
@NoArgsConstructor
public class PagamentoMock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long empresaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plano_id", nullable = false)
    private Plano plano;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal valor;

    @Column(nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private StatusPagamento status = StatusPagamento.PENDENTE;

    @Column(length = 30)
    private String forma;

    @Column(length = 100)
    private String referencia;

    @Column(nullable = false)
    private LocalDateTime createdDate = LocalDateTime.now();

    public enum StatusPagamento {
        PENDENTE, APROVADO, RECUSADO
    }
}
