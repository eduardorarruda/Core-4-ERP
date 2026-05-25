package br.com.core4erp.empresa.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "tb_permissao")
public class Permissao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 60)
    private String codigo;

    @Column(nullable = false, length = 40)
    private String modulo;

    @Column(nullable = false, length = 20)
    private String acao;

    @Column(length = 200)
    private String descricao;
}
