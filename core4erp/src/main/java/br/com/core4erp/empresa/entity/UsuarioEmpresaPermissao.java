package br.com.core4erp.empresa.entity;

import br.com.core4erp.usuario.entity.Usuario;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "tb_usuario_empresa_permissao",
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"usuario_id", "empresa_id", "permissao_id"}
    )
)
public class UsuarioEmpresaPermissao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "empresa_id", nullable = false)
    private Empresa empresa;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "permissao_id", nullable = false)
    private Permissao permissao;

    @Column(nullable = false)
    private Boolean revogada = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "concedida_por")
    private Usuario concedidaPor;

    @Column(nullable = false)
    private LocalDateTime dataConcessao = LocalDateTime.now();

    @Column(length = 200)
    private String observacao;
}
