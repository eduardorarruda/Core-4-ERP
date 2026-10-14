package br.com.core4erp.empresa.service;

import br.com.core4erp.config.rbac.EscaladaPrivilegioValidator;
import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.tenant.PermissaoCacheService;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.dto.PermissaoUsuarioBulkRequestDto;
import br.com.core4erp.empresa.dto.PermissaoUsuarioRequestDto;
import br.com.core4erp.empresa.entity.Permissao;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import br.com.core4erp.empresa.repository.PerfilAcessoRepository;
import br.com.core4erp.empresa.repository.PermissaoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaPermissaoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static br.com.core4erp.empresa.service.EmpresaTestFixtures.perfil;
import static br.com.core4erp.empresa.service.EmpresaTestFixtures.permissao;
import static br.com.core4erp.empresa.service.EmpresaTestFixtures.vinculo;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Ninguém altera as PRÓPRIAS permissões diretas (auto-concessão de privilégio). */
class UsuarioPermissaoServiceTest {

    private static final long EMPRESA = 10L;
    private static final long EU = 1L;
    private static final long ALVO = 2L;

    private final UsuarioEmpresaRepository ueRepo = mock(UsuarioEmpresaRepository.class);
    private final UsuarioEmpresaPermissaoRepository diretasRepo = mock(UsuarioEmpresaPermissaoRepository.class);
    private final PermissaoRepository permissaoRepo = mock(PermissaoRepository.class);
    private final UsuarioRepository usuarioRepo = mock(UsuarioRepository.class);
    private final PermissaoCacheService cache = mock(PermissaoCacheService.class);
    private final TenantContext ctx = new TenantContext();
    private final EscaladaPrivilegioValidator escalada = new EscaladaPrivilegioValidator(ctx, ueRepo);
    private final PerfilAtribuicaoService atribuicao =
            new PerfilAtribuicaoService(mock(PerfilAcessoRepository.class), escalada, ctx);
    private final UsuarioPermissaoService service = new UsuarioPermissaoService(ueRepo, diretasRepo,
            permissaoRepo, usuarioRepo, new PermissaoCalculadora(), ctx, cache, escalada, atribuicao);

    private final Permissao usuarioEditar = permissao(9, "USUARIO_EDITAR");

    @BeforeEach
    void contexto() {
        ctx.setUsuarioId(EU);
        ctx.setEmpresaId(EMPRESA);
        ctx.setPermissoes(Set.of("USUARIO_EDITAR", "USUARIO_VISUALIZAR"));
        UsuarioEmpresa eu = vinculo(EU, "eu@x.com", EMPRESA, perfil(2, "ADMIN", null, usuarioEditar));
        when(ueRepo.findByUsuarioIdAndEmpresaIdAndAtivoTrue(EU, EMPRESA)).thenReturn(Optional.of(eu));
        UsuarioEmpresa alvo = vinculo(ALVO, "alvo@x.com", EMPRESA, perfil(4, "OPERADOR", null));
        when(ueRepo.findByUsuarioIdAndEmpresaIdAndAtivoTrue(ALVO, EMPRESA)).thenReturn(Optional.of(alvo));
        when(permissaoRepo.findById(9L)).thenReturn(Optional.of(usuarioEditar));
        when(diretasRepo.findByUsuarioIdAndEmpresaIdAndPermissaoId(anyLong(), anyLong(), anyLong()))
                .thenReturn(Optional.empty());
    }

    @AfterEach
    void limpar() {
        ctx.clear();
    }

    @Test
    void concederOuRevogar_proprioUsuario_bloqueado() {
        assertThatThrownBy(() -> service.concederOuRevogar(EU, new PermissaoUsuarioRequestDto(9L, false, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("suas permissões");
        verify(diretasRepo, never()).save(any());
        verify(cache, never()).invalidar(any(), any());
    }

    @Test
    void substituirTodas_proprioUsuario_bloqueadoSemApagarNada() {
        PermissaoUsuarioBulkRequestDto dto =
                new PermissaoUsuarioBulkRequestDto(List.of(new PermissaoUsuarioRequestDto(9L, false, null)));

        assertThatThrownBy(() -> service.substituirTodas(EU, dto)).isInstanceOf(BusinessException.class);
        verify(diretasRepo, never()).deleteAll(any());
        verify(diretasRepo, never()).save(any());
    }

    @Test
    void removerPermissaoDireta_proprioUsuario_bloqueado() {
        assertThatThrownBy(() -> service.removerPermissaoDireta(EU, 9L)).isInstanceOf(BusinessException.class);
        verify(diretasRepo, never()).deleteByUsuarioIdAndEmpresaIdAndPermissaoId(anyLong(), anyLong(), anyLong());
    }

    @Test
    void concederOuRevogar_outroUsuario_permitido() {
        when(diretasRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        var r = service.concederOuRevogar(ALVO, new PermissaoUsuarioRequestDto(9L, false, null));

        assertThat(r.origem()).isEqualTo("DIRETA_CONCEDIDA");
        verify(diretasRepo).save(any());
    }
}
