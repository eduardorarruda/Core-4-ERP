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

    public ChatMensagem(Long usuarioId, Role role, String conteudo) {
        this(usuarioId, role, conteudo, Canal.ASSISTENTE);
    }

    public ChatMensagem(Long usuarioId, Role role, String conteudo, Canal canal) {
        this.usuarioId = usuarioId;
        this.role = role;
        this.conteudo = conteudo;
        this.canal = canal != null ? canal : Canal.ASSISTENTE;
        this.criadoEm = LocalDateTime.now();
    }
}
