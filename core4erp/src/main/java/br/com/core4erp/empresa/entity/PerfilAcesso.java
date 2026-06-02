package br.com.core4erp.empresa.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

@Getter
@Setter
@Entity
@Table(name = "tb_perfil_acesso")
public class PerfilAcesso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String nome;

    @Column(length = 200)
    private String descricao;

    // NULL = perfil do sistema (global); NOT NULL = perfil customizado da empresa
    @Column(name = "empresa_id")
    private Long empresaId;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "tb_perfil_permissao",
        joinColumns = @JoinColumn(name = "perfil_id"),
        inverseJoinColumns = @JoinColumn(name = "permissao_id")
    )
    private Set<Permissao> permissoes = new HashSet<>();
}
