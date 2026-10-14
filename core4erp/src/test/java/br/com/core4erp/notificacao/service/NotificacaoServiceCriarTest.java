package br.com.core4erp.notificacao.service;

import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.enums.TipoNotificacao;
import br.com.core4erp.notificacao.entity.Notificacao;
import br.com.core4erp.notificacao.repository.NotificacaoRepository;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificacaoServiceCriarTest {

    private NotificacaoRepository repository;
    private UsuarioRepository usuarioRepository;
    private NotificacaoService service;

    @BeforeEach
    void setUp() {
        repository = mock(NotificacaoRepository.class);
        usuarioRepository = mock(UsuarioRepository.class);
        service = new NotificacaoService(repository, mock(SecurityContextUtils.class), usuarioRepository);
        when(repository.save(any(Notificacao.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void criar_gravaNotificacaoNaoLidaParaUsuarioEEmpresaExplicitos() {
        Usuario usuario = new Usuario();
        when(usuarioRepository.getReferenceById(10L)).thenReturn(usuario);

        service.criar(10L, 20L, TipoNotificacao.MEMBRO_ADICIONADO,
                " Você foi adicionado à empresa ACME por Maria. ");

        ArgumentCaptor<Notificacao> captor = ArgumentCaptor.forClass(Notificacao.class);
        verify(repository).save(captor.capture());
        Notificacao n = captor.getValue();
        assertSame(usuario, n.getUsuario());
        assertEquals(20L, n.getEmpresaId());
        assertEquals(TipoNotificacao.MEMBRO_ADICIONADO, n.getTipo());
        assertEquals("Você foi adicionado à empresa ACME por Maria.", n.getMensagem());
        assertFalse(n.getLida());
    }

    @Test
    void criar_mensagemLongaTruncadaNoTamanhoDaColuna() {
        service.criar(1L, 2L, TipoNotificacao.MEMBRO_ADICIONADO, "x".repeat(800));
        ArgumentCaptor<Notificacao> captor = ArgumentCaptor.forClass(Notificacao.class);
        verify(repository).save(captor.capture());
        assertEquals(NotificacaoService.MAX_MENSAGEM, captor.getValue().getMensagem().length());
    }

    @Test
    void criar_dadosIncompletos_rejeitaSemGravar() {
        assertThrows(IllegalArgumentException.class,
                () -> service.criar(null, 2L, TipoNotificacao.MEMBRO_ADICIONADO, "msg"));
        assertThrows(IllegalArgumentException.class,
                () -> service.criar(1L, null, TipoNotificacao.MEMBRO_ADICIONADO, "msg"));
        assertThrows(IllegalArgumentException.class, () -> service.criar(1L, 2L, null, "msg"));
        assertThrows(IllegalArgumentException.class,
                () -> service.criar(1L, 2L, TipoNotificacao.MEMBRO_ADICIONADO, "  "));
        verify(repository, never()).save(any());
    }
}
