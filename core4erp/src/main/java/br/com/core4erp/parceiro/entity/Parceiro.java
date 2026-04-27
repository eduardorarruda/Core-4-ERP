package br.com.core4erp.parceiro.entity;

import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.enums.TipoParceiro;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@EqualsAndHashCode(of = "id", callSuper = false)
@Getter
@Setter
@Entity
@Table(name = "tb_parceiro")
public class Parceiro extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoParceiro tipo;

    private String razaoSocial;
    private String nomeFantasia;

    @Column(length = 18)
    private String cpfCnpj;

    private String logradouro;
    private String numero;
    private String complemento;

    @Column(length = 9)
    private String cep;

    private String bairro;
    private String municipio;

    @Column(length = 2)
    private String uf;

    private String telefone;
    private String email;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;
}
