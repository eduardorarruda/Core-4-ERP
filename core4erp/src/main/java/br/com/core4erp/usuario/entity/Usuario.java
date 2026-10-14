package br.com.core4erp.usuario.entity;

import br.com.core4erp.config.auditing.Auditable;
import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@EqualsAndHashCode(of = "id", callSuper = false)
@Getter
@Setter
@Entity
@Table(name = "tb_usuario")
public class Usuario extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "senha_hash", nullable = false)
    private String senhaHash;

    @Column(length = 20)
    private String telefone;

    @Column(nullable = false, length = 50)
    private String role = "ROLE_USER";

    @Column(columnDefinition = "TEXT")
    private String fotoPerfil;

    @Column(name = "login_attempts", nullable = false)
    private int loginAttempts = 0;

    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "reset_token", unique = true, length = 64)
    private String resetToken;

    @Column(name = "reset_token_expiry")
    private LocalDateTime resetTokenExpiry;

    @Column(name = "tipo_conta", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private TipoConta tipoConta = TipoConta.EMPRESA;

    @Column(name = "admin_sistema", nullable = false)
    private Boolean adminSistema = false;

    @Column(name = "senha_provisoria", nullable = false)
    private Boolean senhaProvisoria = false;

    /**
     * Versão dos tokens do usuário (claim {@code tv} do JWT). Incrementar invalida TODOS os
     * tokens já emitidos: troca/redefinição de senha, "sair de todos os dispositivos" e
     * exclusão de conta (V45).
     */
    @Column(name = "token_version", nullable = false)
    private int tokenVersion = 0;

    /** LGPD art. 8º — momento em que o titular aceitou Termos de Uso e Política de Privacidade (V45). */
    @Column(name = "termos_aceitos_em")
    private LocalDateTime termosAceitosEm;

    /** Versão dos documentos legais aceitos no cadastro (V45). */
    @Column(name = "termos_versao", length = 20)
    private String termosVersao;

    public enum TipoConta {
        EMPRESA, PESSOA_FISICA
    }
}
