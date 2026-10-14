package br.com.core4erp.empresa.entity;

import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.config.crypto.CampoCriptografadoConverter;
import br.com.core4erp.config.crypto.IndiceCego;
import br.com.core4erp.plano.entity.Plano;
import jakarta.persistence.*;
import lombok.AccessLevel;
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

    /** CNPJ cifrado em repouso (AES-256-GCM). Unicidade/busca pelo índice cego {@link #cnpjHash}. */
    @Convert(converter = CampoCriptografadoConverter.class)
    @Column(name = "cnpj", length = 255)
    private String cnpj;

    /** Índice cego (HMAC-SHA256) do CNPJ normalizado — UNIQUE parcial no banco (V47). */
    @Setter(AccessLevel.NONE)
    @Column(name = "cnpj_hash", length = 64, unique = true)
    private String cnpjHash;

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

    /** Mantém o índice cego sempre sincronizado com o CNPJ. */
    public void setCnpj(String cnpj) {
        this.cnpj = cnpj;
        this.cnpjHash = IndiceCego.documento(cnpj);
    }
}
