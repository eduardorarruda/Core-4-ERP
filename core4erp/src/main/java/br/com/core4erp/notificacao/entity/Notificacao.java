package br.com.core4erp.notificacao.entity;

import br.com.core4erp.config.auditing.Auditable;
import br.com.core4erp.enums.TipoNotificacao;
import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(
    name = "tb_notificacao",
    indexes = {
        @Index(name = "idx_notif_usuario_lida", columnList = "usuario_id, lida"),
        @Index(name = "idx_notif_usuario_tipo_ref", columnList = "usuario_id, tipo, referencia_id")
    }
)
public class Notificacao extends Auditable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 500)
    private String mensagem;

    @Column(nullable = false)
    private Boolean lida = false;

    @Column(nullable = false)
    private LocalDateTime dataCriacao;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TipoNotificacao tipo;

    private Long referenciaId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @PrePersist
    public void prePersist() {
        if (dataCriacao == null) dataCriacao = LocalDateTime.now();
        if (lida == null) lida = false;
    }
}
