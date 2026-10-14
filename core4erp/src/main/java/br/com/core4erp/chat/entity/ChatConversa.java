package br.com.core4erp.chat.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Uma conversa (thread) do chat IA — estilo ChatGPT. Cada usuário tem várias conversas nomeadas,
 * independentes, dentro de um canal ({@link ChatMensagem.Canal}). As mensagens pertencem a uma
 * conversa (FK), e o contexto/histórico da IA é carregado por conversa.
 */
@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "tb_chat_conversa")
public class ChatConversa {

    private static final int MAX_TITULO = 120;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(nullable = false, length = MAX_TITULO)
    private String titulo = "Nova conversa";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChatMensagem.Canal canal = ChatMensagem.Canal.ASSISTENTE;

    @Column(nullable = false)
    private boolean arquivada = false;

    @Column(name = "criado_em", nullable = false)
    private LocalDateTime criadoEm = LocalDateTime.now();

    @Column(name = "atualizado_em", nullable = false)
    private LocalDateTime atualizadoEm = LocalDateTime.now();

    public ChatConversa(Long usuarioId, ChatMensagem.Canal canal, String titulo) {
        this.usuarioId = usuarioId;
        this.canal = canal != null ? canal : ChatMensagem.Canal.ASSISTENTE;
        setTitulo(titulo);
        this.criadoEm = LocalDateTime.now();
        this.atualizadoEm = this.criadoEm;
    }

    /** Trunca e normaliza o título (nunca vazio, nunca acima do limite da coluna). */
    public void setTitulo(String titulo) {
        String t = titulo == null ? "" : titulo.strip();
        if (t.isEmpty()) t = "Nova conversa";
        this.titulo = t.length() > MAX_TITULO ? t.substring(0, MAX_TITULO) : t;
    }
}
