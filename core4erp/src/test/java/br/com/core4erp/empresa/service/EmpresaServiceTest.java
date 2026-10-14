package br.com.core4erp.empresa.service;

import br.com.core4erp.config.rbac.EscaladaPrivilegioValidator;
import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.tenant.PermissaoCacheService;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.empresa.dto.AlterarPerfilRequestDto;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import br.com.core4erp.empresa.repository.EmpresaRepository;
import br.com.core4erp.empresa.repository.PerfilAcessoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaPermissaoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.exception.BusinessException;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
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
import static org.mockito.Mockito.when;

class EmpresaServiceTest {

    private static final long EMPRESA = 10L;
    private static final long EU = 1L;
    private static final long ALVO = 2L;

    private final UsuarioEmpresaRepository ueRepo = mock(UsuarioEmpresaRepository.class);
    private final PerfilAcessoRepository perfilRepo = mock(PerfilAcessoRepository.class);
    private final Cache<String, Set<String>> caffeine = Caffeine.newBuilder().build();
    private final TenantContext ctx = new TenantContext();
    private final EmpresaService service = new EmpresaService(mock(EmpresaRepository.class), ueRepo,
            mock(UsuarioEmpresaPermissaoRepository.class), perfilRepo, mock(UsuarioRepository.class),
            new PermissaoCalculadora(), ctx, new PermissaoCacheService(caffeine),
            new PerfilAtribuicaoService(perfilRepo, new EscaladaPrivilegioValidator(ctx, ueRepo), ctx));

    private UsuarioEmpresa alvo;

    @BeforeEach
    void contexto() {
        ctx.setUsuarioId(EU);
        ctx.setEmpresaId(EMPRESA);
        ctx.setPermissoes(Set.of("CONTA_VISUALIZAR"));
        when(ueRepo.findByUsuarioIdAndEmpresaIdAndAtivoTrue(EU, EMPRESA))
                .thenReturn(Optional.of(vinculo(EU, "eu@x.com", EMPRESA, perfil(2, "ADMIN", null))));
        alvo = vinculo(ALVO, "alvo@x.com", EMPRESA, perfil(4, "OPERADOR", null));
        when(ueRepo.findByUsuarioIdAndEmpresaIdAndAtivoTrue(ALVO, EMPRESA)).thenReturn(Optional.of(alvo));
        when(ueRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @AfterEach
    void limpar() {
        ctx.clear();
    }

    @Test
    void alterarPerfil_invalidaACacheComAMesmaChaveDoTenantFilter() {
        String chave = PermissaoCacheService.chave("alvo@x.com", EMPRESA);
        caffeine.put(chave, Set.of("ANTIGA"));
        when(perfilRepo.findAtribuivelNaEmpresa(5L, EMPRESA))
                .thenReturn(Optional.of(perfil(5, "VISUALIZADOR", null, permissao(1, "CONTA_VISUALIZAR"))));

        service.alterarPerfil(ALVO, new AlterarPerfilRequestDto(5L));

        assertThat(caffeine.getIfPresent(chave)).isNull();
        assertThat(alvo.getPerfil().getNome()).isEqualTo("VISUALIZADOR");
    }

    @Test
    void alterarPerfil_perfilDeOutraEmpresa_naoEncontrado() {
        when(perfilRepo.findAtribuivelNaEmpresa(77L, EMPRESA)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.alterarPerfil(ALVO, new AlterarPerfilRequestDto(77L)))
                .isInstanceOf(EntityNotFoundException.class);
    }

    @Test
    void alterarPerfil_proprioUsuario_bloqueado() {
        assertThatThrownBy(() -> service.alterarPerfil(EU, new AlterarPerfilRequestDto(5L)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void removerMembro_invalidaCache() {
        String chave = PermissaoCacheService.chave("alvo@x.com", EMPRESA);
        caffeine.put(chave, Set.of("X"));
        service.removerMembro(ALVO);
        assertThat(caffeine.getIfPresent(chave)).isNull();
        assertThat(alvo.getAtivo()).isFalse();
    }
}
