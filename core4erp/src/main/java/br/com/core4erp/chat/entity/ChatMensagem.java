package br.com.core4erp.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Mensagem persistida do chat IA. Fonte da verdade do histórico de conversa
 * por usuário — sobrevive a restart e funciona com múltiplas instâncias.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "tb_chat_mensagem")
public class ChatMensagem {

    public enum Role { USER, ASSISTANT }

    /** Superfície da conversa: tela do Assistente ou balão flutuante — cada uma tem contexto próprio. */
    public enum Canal { ASSISTENTE, BALAO }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    /** Conversa (thread) a que a mensagem pertence. */
    @Column(name = "conversa_id", nullable = false)
    private Long conversaId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Canal canal = Canal.ASSISTENTE;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String conteudo;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm;

    public ChatMensagem(Long usuarioId, Long conversaId, Canal canal, Role role, String conteudo) {
        this.usuarioId = usuarioId;
        this.conversaId = conversaId;
        this.canal = canal != null ? canal : Canal.ASSISTENTE;
        this.role = role;
        this.conteudo = conteudo;
        this.criadoEm = LocalDateTime.now();
    }
}
