package br.com.core4erp.chat.service;

import br.com.core4erp.chat.entity.ChatAuditoria;
import br.com.core4erp.chat.repository.ChatAuditoriaRepository;
import br.com.core4erp.config.security.SecurityContextUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Persiste a trilha de auditoria das operações de escrita do chat IA.
 *
 * <p>A gravação roda em transação própria ({@code REQUIRES_NEW}) e nunca propaga exceção:
 * uma falha de auditoria jamais pode reverter ou impedir a operação financeira do usuário.
 */
@Service
public class ChatAuditoriaService {

    private static final Logger log = LoggerFactory.getLogger(ChatAuditoriaService.class);
    private static final int MAX_DETALHE = 1000;

    private final ChatAuditoriaRepository repository;
    private final SecurityContextUtils securityCtx;

    public ChatAuditoriaService(ChatAuditoriaRepository repository, SecurityContextUtils securityCtx) {
        this.repository = repository;
        this.securityCtx = securityCtx;
    }

    // Nota: a publicação de eventos ao n8n foi movida para EventoN8nAspect, que intercepta a camada
    // de service e cobre TODAS as ações (tela + IA) num ponto único, sem duplicar.
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void registrar(String ferramenta, String detalhe) {
        try {
            Long usuarioId = securityCtx.getUsuarioId();
            String texto = detalhe != null && detalhe.length() > MAX_DETALHE
                    ? detalhe.substring(0, MAX_DETALHE)
                    : detalhe;
            repository.save(new ChatAuditoria(usuarioId, ferramenta, texto));
        } catch (Exception e) {
            log.warn("Falha ao persistir auditoria do chat (ferramenta={}): {}", ferramenta, e.getMessage());
        }
    }
}
