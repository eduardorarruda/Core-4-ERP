package br.com.core4erp.empresa.service;

import br.com.core4erp.config.rbac.EscaladaPrivilegioValidator;
import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.tenant.PermissaoCacheService;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.entity.PerfilAcesso;
import br.com.core4erp.empresa.entity.Permissao;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import br.com.core4erp.empresa.repository.PerfilAcessoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.exception.AcessoNegadoException;
import br.com.core4erp.exception.BusinessException;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.Set;

import static br.com.core4erp.empresa.service.EmpresaTestFixtures.perfil;
import static br.com.core4erp.empresa.service.EmpresaTestFixtures.permissao;
import static br.com.core4erp.empresa.service.EmpresaTestFixtures.vinculo;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OperadorServiceTest {

    private static final long EMPRESA = 10L;
    private static final long EU = 1L;
    private static final long ALVO = 2L;

    private final UsuarioEmpresaRepository ueRepo = mock(UsuarioEmpresaRepository.class);
    private final PerfilAcessoRepository perfilRepo = mock(PerfilAcessoRepository.class);
    private final PermissaoCacheService cache = mock(PermissaoCacheService.class);
    private final TenantContext ctx = new TenantContext();
    private final PerfilAtribuicaoService atribuicao =
            new PerfilAtribuicaoService(perfilRepo, new EscaladaPrivilegioValidator(ctx, ueRepo), ctx);
    private final OperadorService service =
            new OperadorService(ueRepo, new PermissaoCalculadora(), ctx, atribuicao, cache);

    private final Permissao visualizar = permissao(1, "CONTA_VISUALIZAR");
    private final Permissao deletar = permissao(2, "CONTA_DELETAR");
    private UsuarioEmpresa alvo;

    @BeforeEach
    void contexto() {
        ctx.setUsuarioId(EU);
        ctx.setEmpresaId(EMPRESA);
        ctx.setPermissoes(Set.of("CONTA_VISUALIZAR", "USUARIO_EDITAR"));
        when(ueRepo.findByUsuarioIdAndEmpresaIdAndAtivoTrue(EU, EMPRESA))
                .thenReturn(Optional.of(vinculo(EU, "eu@x.com", EMPRESA, perfil(2, "ADMIN", null))));
        alvo = vinculo(ALVO, "alvo@x.com", EMPRESA, perfil(4, "OPERADOR", null, visualizar));
        when(ueRepo.findByUsuarioIdAndEmpresaIdAndAtivoTrue(ALVO, EMPRESA)).thenReturn(Optional.of(alvo));
        when(ueRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @AfterEach
    void limpar() {
        ctx.clear();
    }

    @Test
    void alterarPerfil_perfilDeOutraEmpresa_naoEncontrado() {
        when(perfilRepo.findAtribuivelNaEmpresa(77L, EMPRESA)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.alterarPerfil(ALVO, 77L)).isInstanceOf(EntityNotFoundException.class);
        assertThat(alvo.getPerfil().getNome()).isEqualTo("OPERADOR");
    }

    @Test
    void alterarPerfil_proprioUsuario_bloqueado() {
        assertThatThrownBy(() -> service.alterarPerfil(EU, 4L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("próprio perfil");
    }

    @Test
    void alterarPerfil_perfilComPermissoesQueOAtorNaoTem_negado() {
        PerfilAcesso poderoso = perfil(9, "GERENTE", EMPRESA, visualizar, deletar);
        when(perfilRepo.findAtribuivelNaEmpresa(9L, EMPRESA)).thenReturn(Optional.of(poderoso));

        assertThatThrownBy(() -> service.alterarPerfil(ALVO, 9L)).isInstanceOf(AcessoNegadoException.class);
        verify(ueRepo, never()).save(any());
    }

    @Test
    void alterarPerfil_paraProprietario_negado() {
        when(perfilRepo.findAtribuivelNaEmpresa(1L, EMPRESA)).thenReturn(Optional.of(perfil(1, "PROPRIETARIO", null)));
        assertThatThrownBy(() -> service.alterarPerfil(ALVO, 1L)).isInstanceOf(BusinessException.class);
    }

    @Test
    void alterarPerfil_valido_trocaEInvalidaCacheDoAlvo() {
        PerfilAcesso leitor = perfil(5, "VISUALIZADOR", null, visualizar);
        when(perfilRepo.findAtribuivelNaEmpresa(5L, EMPRESA)).thenReturn(Optional.of(leitor));

        var dto = service.alterarPerfil(ALVO, 5L);

        assertThat(dto.perfilNome()).isEqualTo("VISUALIZADOR");
        verify(cache).invalidar("alvo@x.com", EMPRESA);
    }

    @Test
    void remover_invalidaCache() {
        service.remover(ALVO);
        assertThat(alvo.getAtivo()).isFalse();
        verify(cache).invalidar("alvo@x.com", EMPRESA);
    }

    @Test
    void remover_asiMesmo_bloqueado() {
        assertThatThrownBy(() -> service.remover(EU)).isInstanceOf(BusinessException.class);
    }

    @Test
    void reativar_invalidaCache() {
        alvo.setAtivo(false);
        when(ueRepo.findByUsuarioIdAndEmpresaId(ALVO, EMPRESA)).thenReturn(Optional.of(alvo));
        service.reativar(ALVO);
        assertThat(alvo.getAtivo()).isTrue();
        verify(cache).invalidar("alvo@x.com", EMPRESA);
    }
}
