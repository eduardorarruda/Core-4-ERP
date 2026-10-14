package br.com.core4erp.auth.service;

import br.com.core4erp.auth.dto.LoginRequestDto;
import br.com.core4erp.auth.dto.RegistrarRequestDto;
import br.com.core4erp.auth.dto.TrocarSenhaRequestDto;
import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.security.JwtService;
import br.com.core4erp.config.security.SessaoUsuarioService;
import br.com.core4erp.empresa.entity.Empresa;
import br.com.core4erp.empresa.entity.PerfilAcesso;
import br.com.core4erp.empresa.repository.EmpresaRepository;
import br.com.core4erp.empresa.repository.PerfilAcessoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaPermissaoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private final UsuarioRepository usuarioRepo = mock(UsuarioRepository.class);
    private final UsuarioEmpresaRepository ueRepo = mock(UsuarioEmpresaRepository.class);
    private final PerfilAcessoRepository perfilRepo = mock(PerfilAcessoRepository.class);
    private final EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
    private final SessaoUsuarioService sessaoService = new SessaoUsuarioService(usuarioRepo);
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(4);
    private final TentativasLoginService tentativas = new TentativasLoginService();
    private final JwtService jwt = new JwtService("x".repeat(64), 3_600_000L, "", "", new MockEnvironment());
    private final AuthService service = new AuthService(usuarioRepo, encoder, jwt, ueRepo,
            mock(UsuarioEmpresaPermissaoRepository.class), perfilRepo, empresaRepo,
            new PermissaoCalculadora(), sessaoService, tentativas);

    @BeforeEach
    void stubs() {
        when(usuarioRepo.save(any())).thenAnswer(inv -> {
            Usuario u = inv.getArgument(0);
            if (u.getId() == null) u.setId(42L);
            return u;
        });
        when(empresaRepo.save(any())).thenAnswer(inv -> inv.getArgument(0, Empresa.class));
        PerfilAcesso prop = new PerfilAcesso();
        prop.setNome("PROPRIETARIO");
        when(perfilRepo.findByNomeAndEmpresaIdIsNull("PROPRIETARIO")).thenReturn(Optional.of(prop));
    }

    private static RegistrarRequestDto registro(Usuario.TipoConta tipo) {
        return new RegistrarRequestDto("Fulano", "fulano@empresa.com", "Senha123", null, tipo, "ACME",
                true, "2026-10");
    }

    @Test
    void registrar_contaEmpresa_recebeRoleUser_nuncaAdmin() {
        service.registrar(registro(Usuario.TipoConta.EMPRESA), "1.1.1.1");

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepo).save(captor.capture());
        assertThat(captor.getValue().getRole()).isEqualTo("ROLE_USER");
    }

    @Test
    void registrar_gravaConsentimento() {
        service.registrar(registro(Usuario.TipoConta.PESSOA_FISICA), "1.1.1.1");

        ArgumentCaptor<Usuario> captor = ArgumentCaptor.forClass(Usuario.class);
        verify(usuarioRepo).save(captor.capture());
        assertThat(captor.getValue().getTermosAceitosEm()).isNotNull();
        assertThat(captor.getValue().getTermosVersao()).isEqualTo("2026-10");
        assertThat(captor.getValue().getRole()).isEqualTo("ROLE_USER");
    }

    private Usuario usuario(String senha) {
        Usuario u = new Usuario();
        u.setId(7L);
        u.setEmail("a@b.com");
        u.setSenhaHash(encoder.encode(senha));
        u.setTokenVersion(2);
        return u;
    }

    @Test
    void login_tokenCarregaVersaoAtualDoUsuario() {
        Usuario u = usuario("Senha123");
        when(usuarioRepo.findByEmail("a@b.com")).thenReturn(Optional.of(u));
        when(ueRepo.findByUsuario_EmailAndAtivoTrue("a@b.com")).thenReturn(List.of());

        AuthService.LoginResult r = service.login(new LoginRequestDto("a@b.com", "Senha123"), "1.1.1.1");

        assertThat(jwt.validar(r.token()).tokenVersion()).isEqualTo(2);
    }

    @Test
    void login_senhaErrada_incrementaTentativasSemRollback() throws Exception {
        Usuario u = usuario("Senha123");
        when(usuarioRepo.findByEmail("a@b.com")).thenReturn(Optional.of(u));

        assertThatThrownBy(() -> service.login(new LoginRequestDto("a@b.com", "errada"), "1.1.1.1"))
                .isInstanceOf(BadCredentialsException.class);

        assertThat(u.getLoginAttempts()).isEqualTo(1);
        Transactional tx = AuthService.class
                .getMethod("login", LoginRequestDto.class, String.class).getAnnotation(Transactional.class);
        // Sem noRollbackFor o contador de tentativas era revertido e o bloqueio nunca acontecia
        assertThat(tx.noRollbackFor()).contains(BadCredentialsException.class);
    }

    @Test
    void login_redeDeSeguranca_bloqueiaContaNoBancoSoNoLimiteAlto() {
        Usuario u = usuario("Senha123");
        u.setLoginAttempts(AuthService.MAX_FALHAS_CONTA - 2);
        when(usuarioRepo.findByEmail("a@b.com")).thenReturn(Optional.of(u));

        assertThatThrownBy(() -> service.login(new LoginRequestDto("a@b.com", "errada"), "1.1.1.1"))
                .isInstanceOf(BadCredentialsException.class);
        assertThat(u.getLockedUntil()).isNull();

        assertThatThrownBy(() -> service.login(new LoginRequestDto("a@b.com", "errada"), "2.2.2.2"))
                .isInstanceOf(BadCredentialsException.class);
        assertThat(u.getLockedUntil()).isNotNull();
    }

    private void falharVezes(String email, String ip, int vezes) {
        for (int i = 0; i < vezes; i++) {
            assertThatThrownBy(() -> service.login(new LoginRequestDto(email, "errada"), ip))
                    .isInstanceOf(BadCredentialsException.class);
        }
    }

    @Test
    void login_cincoFalhasNoMesmoIp_bloqueiaSoEsseIpComMesma401() {
        Usuario u = usuario("Senha123");
        when(usuarioRepo.findByEmail("a@b.com")).thenReturn(Optional.of(u));
        when(ueRepo.findByUsuario_EmailAndAtivoTrue("a@b.com")).thenReturn(List.of());

        falharVezes("a@b.com", "6.6.6.6", TentativasLoginService.FALHAS_ANTES_DO_BLOQUEIO);

        // O atacante (6.6.6.6) fica bloqueado mesmo com a senha certa — mesma resposta genérica
        assertThatThrownBy(() -> service.login(new LoginRequestDto("a@b.com", "Senha123"), "6.6.6.6"))
                .isInstanceOf(BadCredentialsException.class)
                .hasMessage("Credenciais inválidas");
        // ...mas o dono, de outro IP, continua entrando (sem DoS de lockout)
        assertThat(service.login(new LoginRequestDto("a@b.com", "Senha123"), "1.1.1.1").token()).isNotBlank();
        assertThat(u.getLockedUntil()).isNull();
    }

    @Test
    void login_contaBloqueadaNoBanco_respondeIgualAContaInexistente() {
        Usuario u = usuario("Senha123");
        u.setLockedUntil(java.time.LocalDateTime.now().plusMinutes(10));
        when(usuarioRepo.findByEmail("a@b.com")).thenReturn(Optional.of(u));
        when(usuarioRepo.findByEmail("nao@existe.com")).thenReturn(Optional.empty());

        Throwable bloqueada = org.assertj.core.api.Assertions.catchThrowable(
                () -> service.login(new LoginRequestDto("a@b.com", "Senha123"), "1.1.1.1"));
        Throwable inexistente = org.assertj.core.api.Assertions.catchThrowable(
                () -> service.login(new LoginRequestDto("nao@existe.com", "Senha123"), "1.1.1.1"));

        assertThat(bloqueada).isInstanceOf(BadCredentialsException.class);
        assertThat(inexistente).isInstanceOf(BadCredentialsException.class);
        assertThat(bloqueada.getMessage()).isEqualTo(inexistente.getMessage());
    }

    @Test
    void login_emailInexistente_tambemEntraNoBackoff() {
        when(usuarioRepo.findByEmail("nao@existe.com")).thenReturn(Optional.empty());

        falharVezes("nao@existe.com", "6.6.6.6", TentativasLoginService.FALHAS_ANTES_DO_BLOQUEIO);

        assertThat(tentativas.estaBloqueado("nao@existe.com", "6.6.6.6")).isTrue();
        assertThat(tentativas.estaBloqueado("nao@existe.com", "1.1.1.1")).isFalse();
    }

    @Test
    void trocarSenha_revogaTokensAntigosELiberaSenhaProvisoria() {
        Usuario u = usuario("Senha123");
        u.setSenhaProvisoria(true);
        when(usuarioRepo.findByEmail("a@b.com")).thenReturn(Optional.of(u));
        String antigo = jwt.generateToken("a@b.com", 2);

        String novo = service.trocarSenha("a@b.com", new TrocarSenhaRequestDto("Senha123", "NovaSenha1"));

        assertThat(u.getTokenVersion()).isEqualTo(3);
        assertThat(u.getSenhaProvisoria()).isFalse();
        assertThat(jwt.validar(novo).tokenVersion()).isEqualTo(3);
        assertThat(jwt.validar(antigo).tokenVersion()).isNotEqualTo(u.getTokenVersion());
        assertThat(encoder.matches("NovaSenha1", u.getSenhaHash())).isTrue();
    }

    @Test
    void trocarSenha_senhaAtualErrada_naoAltera() {
        Usuario u = usuario("Senha123");
        when(usuarioRepo.findByEmail("a@b.com")).thenReturn(Optional.of(u));
        assertThatThrownBy(() -> service.trocarSenha("a@b.com", new TrocarSenhaRequestDto("x", "NovaSenha1")))
                .isInstanceOf(BusinessException.class);
        assertThat(u.getTokenVersion()).isEqualTo(2);
    }

    @Test
    void logoutTodos_incrementaVersao() {
        Usuario u = usuario("Senha123");
        when(usuarioRepo.findByEmail("a@b.com")).thenReturn(Optional.of(u));
        service.logoutTodos("a@b.com");
        assertThat(u.getTokenVersion()).isEqualTo(3);
        verify(usuarioRepo).save(u);
    }
}
