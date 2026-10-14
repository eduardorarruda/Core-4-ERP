package br.com.core4erp.empresa.service;

import br.com.core4erp.auth.service.EmailService;
import br.com.core4erp.config.rbac.EscaladaPrivilegioValidator;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.dto.ConvidarOperadorRequestDto;
import br.com.core4erp.empresa.repository.ConviteRepository;
import br.com.core4erp.empresa.repository.EmpresaRepository;
import br.com.core4erp.empresa.repository.PerfilAcessoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.exception.AcessoNegadoException;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.Set;

import static br.com.core4erp.empresa.service.EmpresaTestFixtures.perfil;
import static br.com.core4erp.empresa.service.EmpresaTestFixtures.permissao;
import static br.com.core4erp.empresa.service.EmpresaTestFixtures.vinculo;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ConviteServiceTest {

    private static final long EMPRESA = 10L;

    private final ConviteRepository conviteRepo = mock(ConviteRepository.class);
    private final UsuarioEmpresaRepository ueRepo = mock(UsuarioEmpresaRepository.class);
    private final PerfilAcessoRepository perfilRepo = mock(PerfilAcessoRepository.class);
    private final TenantContext ctx = new TenantContext();
    private final UsuarioRepository usuarioRepo = mock(UsuarioRepository.class);
    private final EmpresaRepository empresaRepo = mock(EmpresaRepository.class);
    private final br.com.core4erp.notificacao.service.NotificacaoService notificacaoService =
            mock(br.com.core4erp.notificacao.service.NotificacaoService.class);
    private final ConviteService service = new ConviteService(conviteRepo, ueRepo,
            new PerfilAtribuicaoService(perfilRepo, new EscaladaPrivilegioValidator(ctx, ueRepo), ctx),
            empresaRepo, usuarioRepo, mock(PasswordEncoder.class),
            mock(PlanoLimitValidator.class), mock(TokenGenerator.class), ctx, mock(EmailService.class),
            notificacaoService);

    @BeforeEach
    void contexto() {
        ctx.setUsuarioId(1L);
        ctx.setEmpresaId(EMPRESA);
        ctx.setPermissoes(Set.of("USUARIO_CONVIDAR", "CONTA_VISUALIZAR"));
        when(ueRepo.findByUsuarioIdAndEmpresaIdAndAtivoTrue(1L, EMPRESA))
                .thenReturn(Optional.of(vinculo(1L, "eu@x.com", EMPRESA, perfil(2, "ADMIN", null))));
    }

    @AfterEach
    void limpar() {
        ctx.clear();
    }

    @Test
    void convidar_comPerfilDeOutraEmpresa_naoEncontrado() {
        when(perfilRepo.findAtribuivelNaEmpresa(77L, EMPRESA)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.convidar(new ConvidarOperadorRequestDto("novo@x.com", 77L)))
                .isInstanceOf(EntityNotFoundException.class);
        verify(conviteRepo, never()).save(any());
    }

    @Test
    void convidar_comPerfilMaisPoderosoQueOAtor_negado() {
        when(perfilRepo.findAtribuivelNaEmpresa(9L, EMPRESA))
                .thenReturn(Optional.of(perfil(9, "GERENTE", EMPRESA, permissao(3, "CONFIGURACAO_EDITAR"))));
        assertThatThrownBy(() -> service.convidar(new ConvidarOperadorRequestDto("novo@x.com", 9L)))
                .isInstanceOf(AcessoNegadoException.class);
        verify(conviteRepo, never()).save(any());
    }

    @Test
    void aceitar_gravaConsentimentoDoConvidado() {
        br.com.core4erp.empresa.entity.Convite convite = new br.com.core4erp.empresa.entity.Convite();
        convite.setEmailConvidado("novo@x.com");
        convite.setExpiraEm(java.time.LocalDateTime.now().plusHours(1));
        convite.setEmpresa(vinculo(1L, "eu@x.com", EMPRESA, null).getEmpresa());
        convite.setPerfil(perfil(4, "OPERADOR", null));
        when(conviteRepo.findByToken("tok")).thenReturn(Optional.of(convite));
        org.mockito.ArgumentCaptor<br.com.core4erp.usuario.entity.Usuario> captor =
                org.mockito.ArgumentCaptor.forClass(br.com.core4erp.usuario.entity.Usuario.class);

        service.aceitar(new br.com.core4erp.empresa.dto.AceitarConviteRequestDto("tok", "Novo", "Senha123", true, "2026-10"));

        verify(usuarioRepo).save(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getTermosVersao()).isEqualTo("2026-10");
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getTermosAceitosEm()).isNotNull();
    }

    @Test
    void convidar_usuarioExistente_adicionadoDiretamenteENotificado() {
        when(perfilRepo.findAtribuivelNaEmpresa(4L, EMPRESA))
                .thenReturn(Optional.of(perfil(4, "OPERADOR", null, permissao(5, "CONTA_VISUALIZAR"))));
        br.com.core4erp.usuario.entity.Usuario existente = new br.com.core4erp.usuario.entity.Usuario();
        existente.setId(50L);
        existente.setEmail("existente@x.com");
        when(usuarioRepo.findByEmail("existente@x.com")).thenReturn(Optional.of(existente));
        br.com.core4erp.empresa.entity.Empresa empresa = new br.com.core4erp.empresa.entity.Empresa();
        empresa.setNome("ACME");
        when(empresaRepo.getReferenceById(EMPRESA)).thenReturn(empresa);
        br.com.core4erp.usuario.entity.Usuario ator = new br.com.core4erp.usuario.entity.Usuario();
        ator.setNome("Maria");
        when(usuarioRepo.getReferenceById(1L)).thenReturn(ator);

        service.convidar(new ConvidarOperadorRequestDto("existente@x.com", 4L));

        verify(notificacaoService).criar(50L, EMPRESA,
                br.com.core4erp.enums.TipoNotificacao.MEMBRO_ADICIONADO,
                "Você foi adicionado à empresa ACME por Maria.");
        verify(conviteRepo, never()).save(any());
    }
}
