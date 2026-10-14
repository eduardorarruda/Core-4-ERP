package br.com.core4erp.parceiro.entity;

import br.com.core4erp.config.auditing.TenantEntity;
import br.com.core4erp.config.crypto.CampoCriptografadoConverter;
import br.com.core4erp.config.crypto.IndiceCego;
import br.com.core4erp.enums.TipoParceiro;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@EqualsAndHashCode(of = "id", callSuper = false)
@Getter
@Setter
@Entity
@Table(name = "tb_parceiro")
public class Parceiro extends TenantEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoParceiro tipo;

    private String razaoSocial;
    private String nomeFantasia;

    /** CPF/CNPJ (só dígitos) cifrado em repouso (AES-256-GCM). Nunca usar em WHERE — use {@link #cpfCnpjHash}. */
    @Convert(converter = CampoCriptografadoConverter.class)
    @Column(name = "cpf_cnpj", length = 255)
    private String cpfCnpj;

    /** Índice cego (HMAC-SHA256) do CPF/CNPJ — busca exata e unicidade por empresa (V47). */
    @Setter(AccessLevel.NONE)
    @Column(name = "cpf_cnpj_hash", length = 64)
    private String cpfCnpjHash;

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

    /** Mantém o índice cego sempre sincronizado com o documento. */
    public void setCpfCnpj(String cpfCnpj) {
        this.cpfCnpj = cpfCnpj;
        this.cpfCnpjHash = IndiceCego.documento(cpfCnpj);
    }
}
