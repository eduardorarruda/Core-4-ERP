package br.com.core4erp.parceiro.entity;

import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.enums.TipoParceiro;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "tb_parceiro")
public class Parceiro extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoParceiro tipo;

    private String razaoSocial;
    private String nomeFantasia;

    @Column(length = 18)
    private String cpfCnpj;

    @Column(length = 500)
    private String endereco;

    private LocalDate dataNascimentoFundacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
