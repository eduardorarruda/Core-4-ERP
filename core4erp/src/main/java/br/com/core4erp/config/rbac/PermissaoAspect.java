package br.com.core4erp.config.rbac;

import br.com.core4erp.config.security.EventoSeguranca;
import br.com.core4erp.config.tenant.TenantContext;
import br.com.core4erp.exception.AcessoNegadoException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
@RequiredArgsConstructor
public class PermissaoAspect {

    private final TenantContext tenantContext;

    @Before("@annotation(requer)")
    public void verificarPermissao(JoinPoint joinPoint, Requer requer) {
        try {
            if (!tenantContext.isPopulado() && !tenantContext.isAdminSistema()) {
                throw new AcessoNegadoException("Contexto de autenticação não inicializado");
            }
            tenantContext.exigirPermissao(requer.value());
        } catch (AcessoNegadoException e) {
            EventoSeguranca.warn(EventoSeguranca.PERMISSAO_NEGADA)
                    .addKeyValue("permissao", requer.value())
                    .addKeyValue("usuarioId", tenantContext.getUsuarioId())
                    .addKeyValue("empresaId", tenantContext.getEmpresaId())
                    .addKeyValue("metodo", joinPoint.getSignature().toShortString())
                    .addKeyValue("path", pathAtual())
                    .log("Permissão negada");
            throw e;
        }
    }

    /** Path HTTP quando houver requisição na thread (chat por streaming roda fora dela). */
    private static String pathAtual() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            HttpServletRequest req = attrs.getRequest();
            return req.getRequestURI();
        }
        return "-";
    }
}
