package br.com.core4erp.config.tenant;

import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.security.SessaoUsuarioService;
import br.com.core4erp.config.security.SessaoUsuarioService.SessaoUsuario;
import br.com.core4erp.empresa.entity.Empresa;
import br.com.core4erp.empresa.entity.PerfilAcesso;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import br.com.core4erp.empresa.repository.UsuarioEmpresaPermissaoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.usuario.entity.Usuario;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.github.benmanes.caffeine.cache.Caffeine;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class TenantFilterTest {

    private final UsuarioEmpresaRepository ueRepo = mock(UsuarioEmpresaRepository.class);
    private final UsuarioEmpresaPermissaoRepository permRepo = mock(UsuarioEmpresaPermissaoRepository.class);
    private final TenantContext ctx = new TenantContext();
    private final TenantFilter filter = new TenantFilter(ueRepo, permRepo, mock(SessaoUsuarioService.class), ctx,
            new PermissaoCacheService(Caffeine.newBuilder().build()), new PermissaoCalculadora(),
            new ObjectMapper().registerModule(new JavaTimeModule()));

    @AfterEach
    void limpar() {
        SecurityContextHolder.clearContext();
        ctx.clear();
    }

    private MockHttpServletRequest autenticada(String empresaHeader) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "a@b.com", null, List.of(new SimpleGrantedAuthority("ROLE_USER"))));
        MockHttpServletRequest r = new MockHttpServletRequest("GET", "/api/contas");
        r.setServletPath("/api/contas");
        r.setAttribute(SessaoUsuarioService.ATRIBUTO_REQUEST,
                new SessaoUsuario(7L, "a@b.com", 0, false, false, "EMPRESA", "ROLE_USER"));
        if (empresaHeader != null) r.addHeader("X-Empresa-Id", empresaHeader);
        return r;
    }

    @Test
    void empresaDaQualNaoEMembro_403JsonSemSeguirACadeia() throws Exception {
        when(ueRepo.findByUsuario_EmailAndEmpresaId("a@b.com", 99L)).thenReturn(Optional.empty());
        MockHttpServletResponse resp = new MockHttpServletResponse();
        FilterChain chain = mock(FilterChain.class);

        filter.doFilter(autenticada("99"), resp, chain);

        assertThat(resp.getStatus()).isEqualTo(403);
        assertThat(resp.getContentAsString()).contains("\"codigo\":\"ACESSO_NEGADO\"");
        org.mockito.Mockito.verifyNoInteractions(chain);
    }

    @Test
    void membroAtivo_populaContextoEDepoisLimpa() throws Exception {
        Usuario u = new Usuario();
        u.setId(7L);
        Empresa e = new Empresa();
        e.setId(5L);
        PerfilAcesso p = new PerfilAcesso();
        p.setNome("OPERADOR");
        UsuarioEmpresa ue = new UsuarioEmpresa();
        ue.setUsuario(u);
        ue.setEmpresa(e);
        ue.setPerfil(p);
        when(ueRepo.findByUsuario_EmailAndEmpresaId("a@b.com", 5L)).thenReturn(Optional.of(ue));
        when(permRepo.findByUsuarioIdAndEmpresaId(any(), any())).thenReturn(List.of());

        AtomicReference<Long> empresaNoChain = new AtomicReference<>();
        filter.doFilter(autenticada("5"), new MockHttpServletResponse(),
                (req, res) -> empresaNoChain.set(ctx.getEmpresaId()));

        assertThat(empresaNoChain.get()).isEqualTo(5L);
        assertThat(ctx.getEmpresaId()).isNull();
    }

    @Test
    void naoAutenticado_naoPopula() throws Exception {
        MockHttpServletRequest r = new MockHttpServletRequest("GET", "/api/planos/ativos");
        AtomicReference<Boolean> populado = new AtomicReference<>();
        filter.doFilter(r, new MockHttpServletResponse(), (req, res) -> populado.set(ctx.isPopulado()));
        assertThat(populado.get()).isFalse();
    }
}
