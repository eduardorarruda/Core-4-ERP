package br.com.core4erp.empresa.service;

import br.com.core4erp.config.rbac.EscaladaPrivilegioValidator;
import br.com.core4erp.config.tenant.PermissaoCacheService;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.dto.PerfilAcessoRequestDto;
import br.com.core4erp.empresa.entity.PerfilAcesso;
import br.com.core4erp.empresa.entity.Permissao;
import br.com.core4erp.empresa.repository.ConviteRepository;
import br.com.core4erp.empresa.repository.PerfilAcessoRepository;
import br.com.core4erp.empresa.repository.PermissaoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.exception.AcessoNegadoException;
import br.com.core4erp.exception.BusinessException;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PerfilAcessoServiceTest {

    private static final long EMPRESA = 10L;
    private static final long EU = 1L;

    private final PerfilAcessoRepository perfilRepo = mock(PerfilAcessoRepository.class);
    private final PermissaoRepository permissaoRepo = mock(PermissaoRepository.class);
    private final UsuarioEmpresaRepository ueRepo = mock(UsuarioEmpresaRepository.class);
    private final ConviteRepository conviteRepo = mock(ConviteRepository.class);
    private final PermissaoCacheService cache = mock(PermissaoCacheService.class);
    private final TenantContext ctx = new TenantContext();
    private final PerfilAcessoService service = new PerfilAcessoService(perfilRepo, permissaoRepo, ctx,
            new EscaladaPrivilegioValidator(ctx, ueRepo), cache, ueRepo, conviteRepo);

    private final Permissao visualizar = permissao(1, "CONTA_VISUALIZAR");
    private final Permissao deletar = permissao(2, "CONTA_DELETAR");

    @BeforeEach
    void contexto() {
        ctx.setUsuarioId(EU);
        ctx.setEmpresaId(EMPRESA);
        ctx.setTipoConta("EMPRESA");
        ctx.setPermissoes(Set.of("CONTA_VISUALIZAR", "CONFIGURACAO_EDITAR"));
        when(perfilRepo.save(any())).thenAnswer(inv -> {
            PerfilAcesso p = inv.getArgument(0);
            if (p.getId() == null) p.setId(99L);
            return p;
        });
    }

    @AfterEach
    void limpar() {
        ctx.clear();
    }

    private void souAdmin() {
        when(ueRepo.findByUsuarioIdAndEmpresaIdAndAtivoTrue(EU, EMPRESA))
                .thenReturn(Optional.of(vinculo(EU, "eu@x.com", EMPRESA, perfil(2, "ADMIN", null))));
    }

    private void souProprietario() {
        when(ueRepo.findByUsuarioIdAndEmpresaIdAndAtivoTrue(EU, EMPRESA))
                .thenReturn(Optional.of(vinculo(EU, "eu@x.com", EMPRESA, perfil(1, "PROPRIETARIO", null))));
    }

    @Test
    void criar_comPermissaoQueOAdminNaoTem_negado() {
        souAdmin();
        when(permissaoRepo.findAllById(Set.of(1L, 2L))).thenReturn(List.of(visualizar, deletar));

        assertThatThrownBy(() -> service.criar(new PerfilAcessoRequestDto("Caixa", null, Set.of(1L, 2L))))
                .isInstanceOf(AcessoNegadoException.class);
        verify(perfilRepo, never()).save(any());
    }

    @Test
    void criar_proprietarioPodeConcederQualquerPermissao() {
        souProprietario();
        when(permissaoRepo.findAllById(Set.of(1L, 2L))).thenReturn(List.of(visualizar, deletar));

        var dto = service.criar(new PerfilAcessoRequestDto("Caixa", null, Set.of(1L, 2L)));

        assertThat(dto.permissoes()).containsExactlyInAnyOrder("CONTA_VISUALIZAR", "CONTA_DELETAR");
    }

    @Test
    void criar_comNomeDePerfilDoSistema_negado() {
        when(perfilRepo.existsByNomeAndEmpresaIdIsNull("PROPRIETARIO")).thenReturn(true);
        assertThatThrownBy(() -> service.criar(new PerfilAcessoRequestDto("proprietario", null, Set.of(1L))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void criar_permissaoInexistente_negado() {
        when(permissaoRepo.findAllById(Set.of(1L, 777L))).thenReturn(List.of(visualizar));
        assertThatThrownBy(() -> service.criar(new PerfilAcessoRequestDto("Caixa", null, Set.of(1L, 777L))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void atualizar_renomearParaProprietario_negado() {
        PerfilAcesso custom = perfil(50, "CAIXA", EMPRESA, visualizar);
        when(perfilRepo.findById(50L)).thenReturn(Optional.of(custom));
        when(perfilRepo.existsByNomeAndEmpresaIdIsNull("PROPRIETARIO")).thenReturn(true);

        assertThatThrownBy(() -> service.atualizar(50L, new PerfilAcessoRequestDto("Proprietario", null, Set.of(1L))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(custom.getNome()).isEqualTo("CAIXA");
    }

    @Test
    void atualizar_nomeDuplicadoNaEmpresa_negado() {
        when(perfilRepo.findById(50L)).thenReturn(Optional.of(perfil(50, "CAIXA", EMPRESA, visualizar)));
        when(perfilRepo.existsByNomeAndEmpresaIdAndIdNot("GERENTE", EMPRESA, 50L)).thenReturn(true);

        assertThatThrownBy(() -> service.atualizar(50L, new PerfilAcessoRequestDto("gerente", null, Set.of(1L))))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void atualizar_acrescentarPermissaoQueNaoTem_negado() {
        souAdmin();
        when(perfilRepo.findById(50L)).thenReturn(Optional.of(perfil(50, "CAIXA", EMPRESA, visualizar)));
        when(permissaoRepo.findAllById(Set.of(1L, 2L))).thenReturn(List.of(visualizar, deletar));

        assertThatThrownBy(() -> service.atualizar(50L, new PerfilAcessoRequestDto("CAIXA", null, Set.of(1L, 2L))))
                .isInstanceOf(AcessoNegadoException.class);
        verify(cache, never()).invalidarTodos();
    }

    @Test
    void atualizar_manterPermissaoJaExistenteQueOAdminNaoTem_permitido() {
        souAdmin();
        when(perfilRepo.findById(50L)).thenReturn(Optional.of(perfil(50, "CAIXA", EMPRESA, visualizar, deletar)));
        when(permissaoRepo.findAllById(Set.of(1L, 2L))).thenReturn(List.of(visualizar, deletar));

        service.atualizar(50L, new PerfilAcessoRequestDto("CAIXA", "nova desc", Set.of(1L, 2L)));

        verify(cache).invalidarTodos();
    }

    @Test
    void atualizar_perfilDeOutraEmpresa_negado() {
        when(perfilRepo.findById(60L)).thenReturn(Optional.of(perfil(60, "X", 999L, visualizar)));
        assertThatThrownBy(() -> service.atualizar(60L, new PerfilAcessoRequestDto("X", null, Set.of(1L))))
                .isInstanceOf(AcessoNegadoException.class);
    }

    @Test
    void deletar_perfilEmUso_409() {
        when(perfilRepo.findById(50L)).thenReturn(Optional.of(perfil(50, "CAIXA", EMPRESA, visualizar)));
        when(ueRepo.existsByPerfilId(50L)).thenReturn(true);

        assertThatThrownBy(() -> service.deletar(50L))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getCode()).isEqualTo("REGISTRO_EM_USO");
        verify(perfilRepo, never()).delete(any());
    }

    @Test
    void deletar_perfilComConvitePendente_409() {
        when(perfilRepo.findById(50L)).thenReturn(Optional.of(perfil(50, "CAIXA", EMPRESA, visualizar)));
        when(conviteRepo.existsByPerfilIdAndAceitoFalse(50L)).thenReturn(true);
        assertThatThrownBy(() -> service.deletar(50L)).isInstanceOf(BusinessException.class);
    }

    @Test
    void deletar_perfilLivre_exclui() {
        PerfilAcesso p = perfil(50, "CAIXA", EMPRESA, visualizar);
        when(perfilRepo.findById(50L)).thenReturn(Optional.of(p));
        service.deletar(50L);
        verify(perfilRepo).delete(p);
    }

    @Test
    void deletar_perfilDoSistema_negado() {
        when(perfilRepo.findById(1L)).thenReturn(Optional.of(perfil(1, "ADMIN", null)));
        assertThatThrownBy(() -> service.deletar(1L)).isInstanceOf(IllegalStateException.class);
        verify(ueRepo, never()).existsByPerfilId(anyLong());
    }

    @Test
    void criar_semConflito_salvaComEmpresaAtual() {
        when(permissaoRepo.findAllById(Set.of(1L))).thenReturn(List.of(visualizar));
        service.criar(new PerfilAcessoRequestDto(" caixa ", null, Set.of(1L)));
        verify(perfilRepo).existsByNomeAndEmpresaId(eq("CAIXA"), eq(EMPRESA));
    }
}
