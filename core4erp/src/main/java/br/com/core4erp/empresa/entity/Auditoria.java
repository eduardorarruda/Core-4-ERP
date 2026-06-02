package br.com.core4erp.empresa.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "tb_auditoria")
public class Auditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long empresaId;

    private Long usuarioId;

    @Column(nullable = false, length = 60)
    private String entidade;

    private Long entidadeId;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private AcaoAuditoria acao;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    private String valorAnterior;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSONB")
    private String valorNovo;

    @Column(length = 45)
    private String ipAddress;

    @Column(length = 36)
    private String requestId;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime dataHora = LocalDateTime.now();
}
