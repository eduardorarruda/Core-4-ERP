package br.com.core4erp.config.tenant;

import br.com.core4erp.config.rbac.PermissaoCalculadora;
import br.com.core4erp.config.security.JwtService;
import br.com.core4erp.empresa.entity.Permissao;
import br.com.core4erp.empresa.entity.UsuarioEmpresa;
import br.com.core4erp.empresa.entity.UsuarioEmpresaPermissao;
import br.com.core4erp.empresa.repository.UsuarioEmpresaPermissaoRepository;
import br.com.core4erp.empresa.repository.UsuarioEmpresaRepository;
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
import java.util.stream.Collectors;

@Component
@Order(3)
public class TenantFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UsuarioEmpresaRepository usuarioEmpresaRepository;
    private final UsuarioEmpresaPermissaoRepository permissaoUsuarioRepository;
    private final TenantContext tenantContext;
    private final Cache<String, Set<String>> permissaoCache;
    private final PermissaoCalculadora permissaoCalculadora;

    public TenantFilter(JwtService jwtService,
                        UsuarioEmpresaRepository usuarioEmpresaRepository,
                        UsuarioEmpresaPermissaoRepository permissaoUsuarioRepository,
                        TenantContext tenantContext,
                        Cache<String, Set<String>> permissaoCache,
                        PermissaoCalculadora permissaoCalculadora) {
        this.jwtService = jwtService;
        this.usuarioEmpresaRepository = usuarioEmpresaRepository;
        this.permissaoUsuarioRepository = permissaoUsuarioRepository;
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
                Long empresaId = resolverEmpresaId(request, email);

                if (empresaId != null) {
                    UsuarioEmpresa ue = usuarioEmpresaRepository
                        .findByUsuario_EmailAndEmpresaId(email, empresaId)
                        .orElse(null);

                    if (ue != null && Boolean.TRUE.equals(ue.getAtivo())) {
                        String cacheKey = email + ":" + empresaId;
                        Set<String> permissoes = permissaoCache.getIfPresent(cacheKey);

                        if (permissoes == null) {
                            permissoes = calcularPermissoes(ue);
                            permissaoCache.put(cacheKey, permissoes);
                        }

                        tenantContext.setUsuarioId(ue.getUsuario().getId());
                        tenantContext.setEmail(email);
                        tenantContext.setEmpresaId(empresaId);
                        tenantContext.setPerfilNome(ue.getPerfil().getNome());
                        tenantContext.setPermissoes(permissoes);

                        MDC.put("empresaId", empresaId.toString());
                        MDC.put("usuarioId", ue.getUsuario().getId().toString());
                    }
                }
            }

            chain.doFilter(request, response);
        } finally {
            MDC.remove("empresaId");
            MDC.remove("usuarioId");
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
