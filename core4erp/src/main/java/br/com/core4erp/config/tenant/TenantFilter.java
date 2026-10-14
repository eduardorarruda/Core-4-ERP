package br.com.core4erp.config.tenant;

import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.security.JwtService;
import br.com.core4erp.empresa.entity.Permissao;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import br.com.core4erp.empresa.entity.UsuarioEmpresaPermissao;
import br.com.core4erp.empresa.repository.UsuarioEmpresaPermissaoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
import br.com.core4erp.usuario.entity.Usuario;
import br.com.core4erp.usuario.repository.UsuarioRepository;
import com.github.benmanes.caffeine.cache.Cache;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@Order(3)
public class TenantFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(TenantFilter.class);

    private final JwtService jwtService;
    private final UsuarioEmpresaRepository usuarioEmpresaRepository;
    private final UsuarioEmpresaPermissaoRepository permissaoUsuarioRepository;
    private final UsuarioRepository usuarioRepository;
    private final TenantContext tenantContext;
    private final Cache<String, Set<String>> permissaoCache;
    private final PermissaoCalculadora permissaoCalculadora;

    public TenantFilter(JwtService jwtService,
                        UsuarioEmpresaRepository usuarioEmpresaRepository,
                        UsuarioEmpresaPermissaoRepository permissaoUsuarioRepository,
                        UsuarioRepository usuarioRepository,
                        TenantContext tenantContext,
                        Cache<String, Set<String>> permissaoCache,
                        PermissaoCalculadora permissaoCalculadora) {
        this.jwtService = jwtService;
        this.usuarioEmpresaRepository = usuarioEmpresaRepository;
        this.permissaoUsuarioRepository = permissaoUsuarioRepository;
        this.usuarioRepository = usuarioRepository;
        this.tenantContext = tenantContext;
        this.permissaoCache = permissaoCache;
        this.permissaoCalculadora = permissaoCalculadora;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String token = extractToken(request);

        try {
            if (token != null && jwtService.isTokenValid(token)) {
                String email = jwtService.extractEmail(token);
                String requestId = UUID.randomUUID().toString();
                MDC.put("requestId", requestId);

                Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);

                if (usuario != null && Boolean.TRUE.equals(usuario.getAdminSistema())) {
                    // Admin sistema: acesso irrestrito, registrar qual empresa está sendo acessada
                    tenantContext.setAdminSistema(true);
                    tenantContext.setUsuarioId(usuario.getId());
                    tenantContext.setEmail(email);
                    tenantContext.setTipoConta(usuario.getTipoConta() != null
                        ? usuario.getTipoConta().name() : "EMPRESA");

                    Long adminEmpresaId = resolverEmpresaIdDoHeader(request, email);
                    if (adminEmpresaId != null) {
                        tenantContext.setEmpresaId(adminEmpresaId);
                        MDC.put("empresaId", adminEmpresaId.toString());
                        // 3.2: acesso de Admin Sistema a uma empresa é privilegiado — registrar em INFO
                        // (trilha de auditoria), não em DEBUG (silencioso em produção).
                        log.info("Admin sistema acessando empresa: adminId={} empresaId={} ip={} metodo={} endpoint={}",
                            usuario.getId(), adminEmpresaId, request.getRemoteAddr(),
                            request.getMethod(), request.getRequestURI());
                    }
                    MDC.put("usuarioId", usuario.getId().toString());

                    try {
                        chain.doFilter(request, response);
                    } finally {
                        tenantContext.clear();
                        MDC.clear();
                    }
                    return;
                }

                Long empresaId = resolverEmpresaId(request, email);

                if (empresaId != null) {
                    UsuarioEmpresa ue = usuarioEmpresaRepository
                        .findByUsuario_EmailAndEmpresaId(email, empresaId)
                        .orElse(null);

                    // CR-B9: usuário autenticado mas não pertence a esta empresa
                    if (ue == null) {
                        log.warn("Acesso cross-tenant negado: email={} empresaId={} ip={}",
                            email, empresaId, request.getRemoteAddr());
                        response.sendError(HttpServletResponse.SC_FORBIDDEN,
                            "Sem acesso a esta empresa");
                        return;
                    }

                    // CR-B6: operador removido ou inativado
                    if (!Boolean.TRUE.equals(ue.getAtivo())) {
                        log.info("Acesso negado — operador inativo: email={} empresaId={}",
                            email, empresaId);
                        response.sendError(HttpServletResponse.SC_UNAUTHORIZED,
                            "Conta inativa nesta empresa");
                        return;
                    }

                    // CR-B10: cache key sem risco de colisão por ':' no email
                    String cacheKey = Integer.toHexString(Objects.hash(email, empresaId));
                    Set<String> permissoes = permissaoCache.get(cacheKey,
                        k -> calcularPermissoes(ue));

                    tenantContext.setUsuarioId(ue.getUsuario().getId());
                    tenantContext.setEmail(email);
                    tenantContext.setEmpresaId(empresaId);
                    tenantContext.setPerfilNome(ue.getPerfil().getNome());
                    tenantContext.setPermissoes(permissoes);
                    if (usuario != null) {
                        tenantContext.setTipoConta(usuario.getTipoConta() != null
                            ? usuario.getTipoConta().name() : "EMPRESA");
                    }

                    MDC.put("empresaId", empresaId.toString());
                    MDC.put("usuarioId", ue.getUsuario().getId().toString());
                }
            }

            chain.doFilter(request, response);
        } finally {
            // Limpa o estado por thread (ThreadLocal) — evita vazamento cross-tenant em threads
            // de pool reaproveitadas. Cobre todos os caminhos, inclusive o return do adminSistema.
            tenantContext.clear();
            MDC.clear();
        }
    }

    private Set<String> calcularPermissoes(UsuarioEmpresa ue) {
        Set<String> doPerfil = ue.getPerfil().getPermissoes()
            .stream().map(Permissao::getCodigo).collect(Collectors.toSet());

        List<UsuarioEmpresaPermissao> diretas = permissaoUsuarioRepository
            .findByUsuarioIdAndEmpresaId(ue.getUsuario().getId(), ue.getEmpresa().getId());

        return permissaoCalculadora.calcular(doPerfil, diretas);
    }

    // Resolve empresaId para usuários regulares — valida pertencimento via lookup subsequente
    private Long resolverEmpresaId(HttpServletRequest request, String email) {
        String header = request.getHeader("X-Empresa-Id");
        if (header != null) {
            try {
                return Long.parseLong(header);
            } catch (NumberFormatException e) {
                log.warn("X-Empresa-Id inválido: header={} email={} ip={}",
                    header, email, request.getRemoteAddr());
                return null;
            }
        }
        return usuarioEmpresaRepository.findByUsuario_EmailAndAtivoTrue(email)
            .stream()
            .findFirst()
            .map(ue -> ue.getEmpresa().getId())
            .orElse(null);
    }

    // Para adminSistema: não valida pertencimento (admin acessa qualquer empresa por design)
    private Long resolverEmpresaIdDoHeader(HttpServletRequest request, String email) {
        String header = request.getHeader("X-Empresa-Id");
        if (header != null) {
            try {
                return Long.parseLong(header);
            } catch (NumberFormatException e) {
                log.warn("X-Empresa-Id inválido (admin): header={} email={}", header, email);
                return null;
            }
        }
        return usuarioEmpresaRepository.findByUsuario_EmailAndAtivoTrue(email)
            .stream()
            .findFirst()
            .map(ue -> ue.getEmpresa().getId())
            .orElse(null);
    }

    private String extractToken(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (Cookie cookie : request.getCookies()) {
                if ("access_token".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        return null;
    }
}
