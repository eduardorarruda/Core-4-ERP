package br.com.core4erp.plano.entity;

import br.com.core4erp.config.auditing.Auditable;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "tb_plano")
@Getter
@Setter
@EqualsAndHashCode(of = "id", callSuper = false)
public class Plano extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 60)
    private String nome;

    @Column(columnDefinition = "TEXT")
    private String descricao;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal precoMensal = BigDecimal.ZERO;

    @Column(nullable = false)
    private Integer maxUsuarios = 1;

    @Column(nullable = false)
    private Integer maxEmpresas = 1;

    @Column(nullable = false)
    private Boolean ativo = true;
}
