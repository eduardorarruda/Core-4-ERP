package br.com.core4erp.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Trilha de auditoria persistida das operações de escrita executadas pelo chat IA
 * (registrar conta, baixa, transferência, investimento, lançamento em cartão, relatório).
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "tb_chat_auditoria")
public class ChatAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(nullable = false, length = 80)
    private String ferramenta;

    @Column(columnDefinition = "TEXT")
    private String detalhe;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    public ChatAuditoria(Long usuarioId, String ferramenta, String detalhe) {
        this.usuarioId = usuarioId;
        this.ferramenta = ferramenta;
        this.detalhe = detalhe;
        this.criadoEm = LocalDateTime.now();
    }
}
