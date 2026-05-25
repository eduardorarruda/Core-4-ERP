package br.com.core4erp.config.rbac;

import br.com.core4erp.config.tenant.TenantContext;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
public class PermissaoAspect {

    private final TenantContext tenantContext;

    @Before("@annotation(requer)")
    public void verificarPermissao(JoinPoint joinPoint, Requer requer) {
        tenantContext.exigirPermissao(requer.value());
    }
}
