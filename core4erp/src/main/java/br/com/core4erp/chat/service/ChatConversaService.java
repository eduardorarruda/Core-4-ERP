package br.com.core4erp.chat.service;

import br.com.core4erp.chat.dto.ChatConversaResponseDto;
import br.com.core4erp.chat.entity.ChatConversa;
import br.com.core4erp.chat.entity.ChatMensagem;
import br.com.core4erp.chat.repository.ChatConversaRepository;
import br.com.core4erp.config.security.SecurityContextUtils;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

/**
 * CRUD das conversas do chat (threads estilo ChatGPT), isolado por usuário. Também resolve a
 * "conversa ativa" quando nenhum id é enviado (compatibilidade com a UI antiga e com o anexo).
 */
@Service
public class ChatConversaService {

    /** Sem id explícito, reaproveita a última conversa se ela ainda estiver "quente" (UI antiga). */
    private static final Duration JANELA_REAPROVEITAR = Duration.ofMinutes(30);

    private static final String TITULO_PADRAO = "Nova conversa";
    private static final String TITULO_LEGADO = "Conversa anterior";

    private final ChatConversaRepository repository;
    private final SecurityContextUtils securityCtx;

    public ChatConversaService(ChatConversaRepository repository, SecurityContextUtils securityCtx) {
        this.repository = repository;
        this.securityCtx = securityCtx;
    }

    @Transactional(readOnly = true)
    public List<ChatConversaResponseDto> listar(ChatMensagem.Canal canal) {
        return repository.findByUsuarioIdAndCanalOrderByAtualizadoEmDescIdDesc(usuarioId(), canal)
                .stream().map(ChatConversaResponseDto::from).toList();
    }

    /** Conversa mais recente do canal (compat com a UI antiga que não tem id de conversa). */
    @Transactional(readOnly = true)
    public java.util.Optional<ChatConversa> conversaMaisRecente(ChatMensagem.Canal canal) {
        return repository.findFirstByUsuarioIdAndCanalOrderByAtualizadoEmDescIdDesc(usuarioId(), canal);
    }

    @Transactional
    public ChatConversa criar(ChatMensagem.Canal canal, String tituloInicial) {
        return repository.save(new ChatConversa(usuarioId(), canal, tituloInicial));
    }

    /** Conversa existente (com dono validado) ou uma nova. Usado pelo ChatService a cada mensagem. */
    @Transactional
    public ChatConversa resolverOuCriar(ChatMensagem.Canal canal, Long conversaId) {
        Long uid = usuarioId();
        if (conversaId != null) {
            return repository.findByIdAndUsuarioId(conversaId, uid)
                    .orElseGet(() -> repository.save(new ChatConversa(uid, canal, TITULO_PADRAO)));
        }
        // Sem id (UI antiga / anexo): reaproveita a última conversa se ainda estiver recente.
        return repository.findFirstByUsuarioIdAndCanalOrderByAtualizadoEmDescIdDesc(uid, canal)
                .filter(c -> Duration.between(c.getAtualizadoEm(), LocalDateTime.now())
                        .compareTo(JANELA_REAPROVEITAR) <= 0)
                .orElseGet(() -> repository.save(new ChatConversa(uid, canal, TITULO_PADRAO)));
    }

    /** Após uma troca de mensagens: sobe a conversa no topo e nomeia com a 1ª pergunta, se preciso. */
    @Transactional
    public void aposMensagem(Long conversaId, String primeiraPergunta) {
        repository.findById(conversaId).ifPresent(c -> {
            c.setAtualizadoEm(LocalDateTime.now());
            if (ehTituloPadrao(c.getTitulo()) && primeiraPergunta != null && !primeiraPergunta.isBlank()) {
                c.setTitulo(resumirTitulo(primeiraPergunta));
            }
            repository.save(c);
        });
    }

    @Transactional
    public ChatConversaResponseDto renomear(Long conversaId, String titulo) {
        ChatConversa c = owned(conversaId);
        c.setTitulo(titulo);
        return ChatConversaResponseDto.from(repository.save(c));
    }

    @Transactional
    public void excluir(Long conversaId) {
        repository.delete(owned(conversaId)); // cascade remove as mensagens (FK ON DELETE CASCADE)
    }

    /** Compatibilidade com o antigo "limpar histórico": apaga todas as conversas do canal. */
    @Transactional
    public void limparCanal(ChatMensagem.Canal canal) {
        repository.deleteByUsuarioIdAndCanal(usuarioId(), canal);
    }

    /** Valida dono e retorna a conversa; lança 404 se não for do usuário. */
    @Transactional(readOnly = true)
    public ChatConversa owned(Long conversaId) {
        return repository.findByIdAndUsuarioId(conversaId, usuarioId())
                .orElseThrow(() -> new EntityNotFoundException("Conversa não encontrada."));
    }

    private Long usuarioId() {
        return securityCtx.getUsuarioId();
    }

    private static boolean ehTituloPadrao(String t) {
        return t == null || t.isBlank() || TITULO_PADRAO.equalsIgnoreCase(t) || TITULO_LEGADO.equalsIgnoreCase(t);
    }

    /** Título curto a partir da 1ª mensagem: 1ª linha, até 80 chars. */
    private static String resumirTitulo(String texto) {
        String t = texto.strip();
        int quebra = t.indexOf('\n');
        if (quebra > 0) t = t.substring(0, quebra).strip();
        return t.length() > 80 ? t.substring(0, 80).strip() + "…" : t;
    }
}
