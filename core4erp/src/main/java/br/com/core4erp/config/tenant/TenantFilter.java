package br.com.core4erp.config.tenant;

import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.security.EventoSeguranca;
import br.com.core4erp.config.security.RespostaErroJson;
import br.com.core4erp.config.security.SessaoUsuarioService;
import br.com.core4erp.config.security.SessaoUsuarioService.SessaoUsuario;
import br.com.core4erp.empresa.entity.Permissao;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import br.com.core4erp.empresa.entity.UsuarioEmpresaPermissao;
import br.com.core4erp.empresa.repository.UsuarioEmpresaPermissaoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Popula o {@link TenantContext} (empresa ativa + permissões efetivas) para o usuário que o
 * {@code JwtFilter} autenticou. Roda logo após o JwtFilter.
 *
 * <p>A identidade vem do {@code SecurityContext} (já validado: assinatura, algoritmo, expiração e
 * versão do token) — o token não é reprocessado aqui, então um token revogado nunca popula o tenant.
 */
@Component
@Order(3)
public class TenantFilter extends OncePerRequestFilter {

    static final String HEADER_EMPRESA = "X-Empresa-Id";
    static final String MDC_USUARIO_ID = "usuarioId";
    static final String MDC_EMPRESA_ID = "empresaId";

    private final UsuarioEmpresaRepository usuarioEmpresaRepository;
    private final UsuarioEmpresaPermissaoRepository permissaoUsuarioRepository;
    private final SessaoUsuarioService sessaoUsuarioService;
    private final TenantContext tenantContext;
    private final PermissaoCacheService permissaoCacheService;
    private final PermissaoCalculadora permissaoCalculadora;
    private final ObjectMapper objectMapper;

    public TenantFilter(UsuarioEmpresaRepository usuarioEmpresaRepository,
                        UsuarioEmpresaPermissaoRepository permissaoUsuarioRepository,
                        SessaoUsuarioService sessaoUsuarioService,
                        TenantContext tenantContext,
                        PermissaoCacheService permissaoCacheService,
                        PermissaoCalculadora permissaoCalculadora,
                        ObjectMapper objectMapper) {
        this.usuarioEmpresaRepository = usuarioEmpresaRepository;
        this.permissaoUsuarioRepository = permissaoUsuarioRepository;
        this.sessaoUsuarioService = sessaoUsuarioService;
        this.tenantContext = tenantContext;
        this.permissaoCacheService = permissaoCacheService;
        this.permissaoCalculadora = permissaoCalculadora;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        try {
            Optional<SessaoUsuario> sessao = sessaoAutenticada(request);
            if (sessao.isPresent() && !popular(sessao.get(), request, response)) {
                return; // resposta de erro já escrita
            }
            chain.doFilter(request, response);
        } finally {
            // Limpa o estado por thread (ThreadLocal) — evita vazamento cross-tenant em threads
            // de pool reaproveitadas. Só remove as chaves de MDC deste filtro (requestId/ip são
            // do RequestContextFilter).
            tenantContext.clear();
            MDC.remove(MDC_EMPRESA_ID);
            MDC.remove(MDC_USUARIO_ID);
        }
    }

    /** @return {@code false} se a requisição foi rejeitada (resposta já escrita). */
    private boolean popular(SessaoUsuario s, HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        MDC.put(MDC_USUARIO_ID, String.valueOf(s.id()));
        if (s.adminSistema()) {
            popularAdmin(s, request);
            return true;
        }

        Long empresaId = resolverEmpresaId(request, s);
        if (empresaId == null) return true;

        UsuarioEmpresa ue = usuarioEmpresaRepository
                .findByUsuario_EmailAndEmpresaId(s.email(), empresaId)
                .orElse(null);

        // CR-B9: usuário autenticado mas não pertence a esta empresa
        if (ue == null) {
            EventoSeguranca.warn(EventoSeguranca.ACESSO_CROSS_TENANT)
                    .addKeyValue("usuarioId", s.id())
                    .addKeyValue("empresaId", empresaId)
                    .addKeyValue("path", request.getRequestURI())
                    .log("Acesso negado: usuário tentou acessar empresa da qual não é membro");
            RespostaErroJson.escrever(response, objectMapper, HttpServletResponse.SC_FORBIDDEN,
                    "ACESSO_NEGADO", "Você não tem acesso a esta empresa.");
            return false;
        }

        // CR-B6: operador removido ou inativado
        if (!Boolean.TRUE.equals(ue.getAtivo())) {
            EventoSeguranca.info(EventoSeguranca.PERMISSAO_NEGADA)
                    .addKeyValue("usuarioId", s.id())
                    .addKeyValue("empresaId", empresaId)
                    .addKeyValue("motivo", "vinculo_inativo")
                    .log("Acesso negado — operador inativo na empresa");
            RespostaErroJson.escrever(response, objectMapper, HttpServletResponse.SC_UNAUTHORIZED,
                    "CONTA_INATIVA", "Seu acesso a esta empresa foi desativado. Fale com o administrador.");
            return false;
        }

        Set<String> permissoes = permissaoCacheService.obter(s.email(), empresaId, () -> calcularPermissoes(ue));

        tenantContext.setUsuarioId(s.id());
        tenantContext.setEmail(s.email());
        tenantContext.setEmpresaId(empresaId);
        tenantContext.setPerfilNome(ue.getPerfil().getNome());
        tenantContext.setPermissoes(permissoes);
        tenantContext.setTipoConta(s.tipoConta());
        MDC.put(MDC_EMPRESA_ID, empresaId.toString());
        return true;
    }

    private void popularAdmin(SessaoUsuario s, HttpServletRequest request) {
        // Admin sistema: acesso irrestrito, registrar qual empresa está sendo acessada
        tenantContext.setAdminSistema(true);
        tenantContext.setUsuarioId(s.id());
        tenantContext.setEmail(s.email());
        tenantContext.setTipoConta(s.tipoConta());

        boolean viaHeader = request.getHeader(HEADER_EMPRESA) != null;
        Long adminEmpresaId = resolverEmpresaId(request, s);
        if (adminEmpresaId == null) return;
        tenantContext.setEmpresaId(adminEmpresaId);
        MDC.put(MDC_EMPRESA_ID, adminEmpresaId.toString());
        if (viaHeader) {
            // 3.2: acesso de Admin Sistema a uma empresa é privilegiado — trilha de auditoria em INFO
            EventoSeguranca.info(EventoSeguranca.ADMIN_ACESSO_EMPRESA)
                    .addKeyValue("usuarioId", s.id())
                    .addKeyValue("empresaId", adminEmpresaId)
                    .addKeyValue("metodo", request.getMethod())
                    .addKeyValue("path", request.getRequestURI())
                    .log("Admin do sistema acessando empresa via X-Empresa-Id");
        }
    }

    private Optional<SessaoUsuario> sessaoAutenticada(HttpServletRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }
        Object attr = request.getAttribute(SessaoUsuarioService.ATRIBUTO_REQUEST);
        if (attr instanceof SessaoUsuario s) return Optional.of(s);
        return sessaoUsuarioService.buscar(auth.getName());
    }

    private Set<String> calcularPermissoes(UsuarioEmpresa ue) {
        Set<String> doPerfil = ue.getPerfil().getPermissoes()
                .stream().map(Permissao::getCodigo).collect(Collectors.toSet());

        List<UsuarioEmpresaPermissao> diretas = permissaoUsuarioRepository
                .findByUsuarioIdAndEmpresaId(ue.getUsuario().getId(), ue.getEmpresa().getId());

        return permissaoCalculadora.calcular(doPerfil, diretas);
    }

    /**
     * Empresa do header {@code X-Empresa-Id} ou, na ausência, o primeiro vínculo ativo. Para usuário
     * regular o pertencimento é validado depois; para admin do sistema não (acesso por design).
     */
    private Long resolverEmpresaId(HttpServletRequest request, SessaoUsuario s) {
        String header = request.getHeader(HEADER_EMPRESA);
        if (header != null) {
            try {
                return Long.parseLong(header.trim());
            } catch (NumberFormatException e) {
                EventoSeguranca.info(EventoSeguranca.PERMISSAO_NEGADA)
                        .addKeyValue("usuarioId", s.id())
                        .addKeyValue("motivo", "x_empresa_id_invalido")
                        .log("Cabeçalho X-Empresa-Id inválido ignorado");
                return null;
            }
        }
        return usuarioEmpresaRepository.findByUsuario_EmailAndAtivoTrue(s.email())
                .stream()
                .findFirst()
                .map(ue -> ue.getEmpresa().getId())
                .orElse(null);
    }
}
