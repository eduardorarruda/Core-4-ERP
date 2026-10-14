package br.com.core4erp.auth.service;

import br.com.core4erp.auth.dto.RedefinirSenhaRequestDto;
import br.com.core4erp.config.security.SessaoUsuarioService;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PasswordResetServiceTest {

    @Test
    void redefinirSenha_revogaTodasAsSessoes() {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        PasswordResetService service = new PasswordResetService(repo, new BCryptPasswordEncoder(4),
                mock(EmailService.class), mock(PlatformTransactionManager.class), new SessaoUsuarioService(repo));
        Usuario u = new Usuario();
        u.setId(1L);
        u.setEmail("a@b.com");
        u.setResetToken(PasswordResetService.hashToken("tok"));
        u.setResetTokenExpiry(LocalDateTime.now().plusMinutes(10));
        u.setSenhaProvisoria(true);
        when(repo.findByResetToken(PasswordResetService.hashToken("tok"))).thenReturn(Optional.of(u));

        service.redefinirSenha(new RedefinirSenhaRequestDto("tok", "NovaSenha1"));

        assertThat(u.getTokenVersion()).isEqualTo(1);
        assertThat(u.getResetToken()).isNull();
        assertThat(u.getSenhaProvisoria()).isFalse();
    }

    @Test
    void gerarTokenReset_gravaSoOHash_eEnviaOTokenEmClaroPorEmail() {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        EmailService email = mock(EmailService.class);
        PlatformTransactionManager tx = mock(PlatformTransactionManager.class);
        PasswordResetService service = new PasswordResetService(repo, new BCryptPasswordEncoder(4), email, tx,
                new SessaoUsuarioService(repo));
        org.springframework.test.util.ReflectionTestUtils.setField(service, "frontendUrl", "https://app");
        Usuario u = new Usuario();
        u.setEmail("a@b.com");
        when(repo.findByEmail("a@b.com")).thenReturn(Optional.of(u));

        service.gerarTokenReset(new br.com.core4erp.auth.dto.EsqueciSenhaRequestDto("a@b.com"));

        org.mockito.ArgumentCaptor<String> token = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(email).enviarResetSenha(org.mockito.ArgumentMatchers.eq("a@b.com"), token.capture(),
                org.mockito.ArgumentMatchers.eq("https://app"));
        assertThat(u.getResetToken()).isNotEqualTo(token.getValue())
                .isEqualTo(PasswordResetService.hashToken(token.getValue())).hasSize(64);
    }

    @Test
    void redefinirSenha_tokenErrado_recusado() {
        UsuarioRepository repo = mock(UsuarioRepository.class);
        PasswordResetService service = new PasswordResetService(repo, new BCryptPasswordEncoder(4),
                mock(EmailService.class), mock(PlatformTransactionManager.class), new SessaoUsuarioService(repo));
        when(repo.findByResetToken(org.mockito.ArgumentMatchers.anyString())).thenReturn(Optional.empty());
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                service.redefinirSenha(new RedefinirSenhaRequestDto("outro", "NovaSenha1")))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
