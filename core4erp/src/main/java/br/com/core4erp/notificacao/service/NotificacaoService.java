package br.com.core4erp.notificacao.service;

import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.enums.TipoNotificacao;
import br.com.core4erp.notificacao.dto.NotificacaoResponseDto;
import br.com.core4erp.notificacao.entity.Notificacao;
import br.com.core4erp.notificacao.repository.NotificacaoRepository;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificacaoService {

    /** Tamanho da coluna tb_notificacao.mensagem. */
    static final int MAX_MENSAGEM = 500;

    private final NotificacaoRepository repository;
    private final SecurityContextUtils securityCtx;
    private final UsuarioRepository usuarioRepository;

    public NotificacaoService(NotificacaoRepository repository, SecurityContextUtils securityCtx,
                              UsuarioRepository usuarioRepository) {
        this.repository = repository;
        this.securityCtx = securityCtx;
        this.usuarioRepository = usuarioRepository;
    }

    /**
     * Cria uma notificação in-app para um usuário, vinculada à empresa informada (explícita — não
     * depende do TenantContext, que pode ser de outra empresa ou estar vazio). Participa da transação
     * do chamador: se a operação de negócio falhar, a notificação não é gravada.
     */
    @Transactional
    public NotificacaoResponseDto criar(Long usuarioId, Long empresaId, TipoNotificacao tipo, String mensagem) {
        if (usuarioId == null || empresaId == null || tipo == null || mensagem == null || mensagem.isBlank()) {
            throw new IllegalArgumentException("Dados insuficientes para criar a notificação.");
        }
        String texto = mensagem.strip();
        Notificacao n = new Notificacao();
        n.setUsuario(usuarioRepository.getReferenceById(usuarioId));
        n.setEmpresaId(empresaId);
        n.setTipo(tipo);
        n.setMensagem(texto.length() > MAX_MENSAGEM ? texto.substring(0, MAX_MENSAGEM - 1) + "…" : texto);
        n.setLida(false);
        return NotificacaoResponseDto.from(repository.save(n));
    }

    @Transactional(readOnly = true)
    public List<NotificacaoResponseDto> listarNaoLidas() {
        return repository.findTop200ByUsuarioIdAndLidaFalseOrderByDataCriacaoDesc(securityCtx.getUsuarioId())
                .stream().map(NotificacaoResponseDto::from).toList();
    }

    @Transactional
    public NotificacaoResponseDto marcarComoLida(Long id) {
        Long uid = securityCtx.getUsuarioId();
        Notificacao n = repository.findByIdAndUsuarioId(id, uid)
                .orElseThrow(() -> new EntityNotFoundException("Notificação não encontrada: " + id));
        n.setLida(true);
        return NotificacaoResponseDto.from(repository.save(n));
    }
}
