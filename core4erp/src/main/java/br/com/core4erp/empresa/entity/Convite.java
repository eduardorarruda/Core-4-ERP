package br.com.core4erp.empresa.entity;

import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "tb_convite",
    uniqueConstraints = @UniqueConstraint(columnNames = {"empresa_id", "email_convidado"})
)
@Getter
@Setter
@NoArgsConstructor
public class Convite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", nullable = false)
    private Empresa empresa;

    @Column(nullable = false, length = 150)
    private String emailConvidado;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "perfil_id", nullable = false)
    private PerfilAcesso perfil;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(nullable = false)
    private LocalDateTime expiraEm;

    @Column(nullable = false)
    private Boolean aceito = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "convidado_por", nullable = false)
    private Usuario convidadoPor;

    @Column(nullable = false)
    private LocalDateTime createdDate = LocalDateTime.now();

    public boolean estaValido() {
        return !aceito && LocalDateTime.now().isBefore(expiraEm);
    }
}
