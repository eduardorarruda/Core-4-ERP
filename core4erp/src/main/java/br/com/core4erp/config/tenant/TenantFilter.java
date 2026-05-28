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
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
@Order(3)
public class TenantFilter extends OncePerRequestFilter {

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

                Usuario usuario = usuarioRepository.findByEmail(email).orElse(null);

                if (usuario != null && Boolean.TRUE.equals(usuario.getAdminSistema())) {
                    tenantContext.setAdminSistema(true);
                    tenantContext.setUsuarioId(usuario.getId());
                    tenantContext.setEmail(email);
                    tenantContext.setTipoConta(usuario.getTipoConta() != null
                        ? usuario.getTipoConta().name() : "EMPRESA");
                    // adminSistema ainda precisa de empresaId para operar nos dados da empresa
                    Long adminEmpresaId = resolverEmpresaId(request, email);
                    if (adminEmpresaId != null) {
                        tenantContext.setEmpresaId(adminEmpresaId);
                        MDC.put("empresaId", adminEmpresaId.toString());
                    }
                    MDC.put("usuarioId", usuario.getId().toString());
                    MDC.put("requestId", UUID.randomUUID().toString());
                    try {
                        chain.doFilter(request, response);
                    } finally {
                        MDC.clear();
                    }
                    return;
                }

                Long empresaId = resolverEmpresaId(request, email);

                if (empresaId != null) {
                    UsuarioEmpresa ue = usuarioEmpresaRepository
                        .findByUsuario_EmailAndEmpresaId(email, empresaId)
                        .orElse(null);

                    if (ue != null && Boolean.TRUE.equals(ue.getAtivo())) {
                        String cacheKey = email + ":" + empresaId;
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
            }

            chain.doFilter(request, response);
        } finally {
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

    private Long resolverEmpresaId(HttpServletRequest request, String email) {
        String header = request.getHeader("X-Empresa-Id");
        if (header != null) {
            try {
                return Long.parseLong(header);
            } catch (NumberFormatException ignored) {
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
