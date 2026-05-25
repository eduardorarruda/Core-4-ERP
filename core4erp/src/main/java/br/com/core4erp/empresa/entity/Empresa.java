package br.com.core4erp.empresa.entity;

import br.com.core4erp.config.auditing.Auditable;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

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

    @Column(nullable = false, length = 30)
    private String plano = "BASICO";

    @Column(nullable = false)
    private Boolean ativa = true;
}
