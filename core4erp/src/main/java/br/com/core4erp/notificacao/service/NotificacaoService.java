package br.com.core4erp.notificacao.service;

import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.notificacao.dto.NotificacaoResponseDto;
import br.com.core4erp.notificacao.entity.Notificacao;
import br.com.core4erp.notificacao.repository.NotificacaoRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class NotificacaoService {

    private final NotificacaoRepository repository;
    private final SecurityContextUtils securityCtx;

    public NotificacaoService(NotificacaoRepository repository, SecurityContextUtils securityCtx) {
        this.repository = repository;
        this.securityCtx = securityCtx;
    }

    @Transactional(readOnly = true)
    public List<NotificacaoResponseDto> listarNaoLidas() {
        return repository.findByUsuarioIdAndLidaFalseOrderByDataCriacaoDesc(securityCtx.getUsuarioId())
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
