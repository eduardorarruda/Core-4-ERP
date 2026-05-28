package br.com.core4erp.empresa.entity;

import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.plano.entity.Plano;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@EqualsAndHashCode(of = "id", callSuper = false)
@Getter
@Setter
@Entity
@Table(name = "tb_empresa")
public class Empresa extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String nome;

    @Column(unique = true, length = 18)
    private String cnpj;

    @Column(length = 150)
    private String emailContato;

    @Column(length = 20)
    private String telefone;

    @Column(name = "plano", nullable = false, length = 30)
    private String planoNome = "BASICO";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plano_id")
    private Plano plano;

    @Column(name = "plano_ativo_desde")
    private LocalDateTime planoAtivoDe;

    @Column(name = "plano_expira_em")
    private LocalDateTime planoExpiraEm;

    @Column(nullable = false)
    private Boolean ativa = true;
}
