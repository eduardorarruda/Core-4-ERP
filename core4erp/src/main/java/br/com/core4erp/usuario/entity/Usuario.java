package br.com.core4erp.usuario.entity;

import br.com.core4erp.config.auditing.Auditable;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

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

    private Long telefone;

    @Column(nullable = false, length = 50)
    private String role = "ROLE_USER";

    @Column(columnDefinition = "TEXT")
    private String fotoPerfil;
}
