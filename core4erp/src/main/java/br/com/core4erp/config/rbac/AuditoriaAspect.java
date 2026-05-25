package br.com.core4erp.config.rbac;

import br.com.core4erp.empresa.entity.AcaoAuditoria;
import br.com.core4erp.empresa.service.AuditoriaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class AuditoriaAspect {

    private final AuditoriaService auditoriaService;

    @Around("execution(* br.com.core4erp.*.service.*Service.criar(..)) || " +
            "execution(* br.com.core4erp.*.service.*Service.atualizar(..)) || " +
            "execution(* br.com.core4erp.*.service.*Service.deletar(..))")
    public Object auditarOperacao(ProceedingJoinPoint pjp) throws Throwable {
        String metodo = pjp.getSignature().getName();
        String classe = pjp.getTarget().getClass().getSimpleName();
        Long id = extrairId(pjp.getArgs());

        Object resultado = pjp.proceed();

        AcaoAuditoria acao = resolverAcao(metodo);
        Object valorNovo = "deletar".equals(metodo) ? null : resultado;

        try {
            auditoriaService.registrar(normalizeEntidade(classe), id, acao, null, valorNovo);
        } catch (Exception e) {
            log.warn("Falha ao registrar auditoria para {}.{}", classe, metodo, e);
        }

        return resultado;
    }

    private AcaoAuditoria resolverAcao(String metodo) {
        return switch (metodo) {
            case "criar"     -> AcaoAuditoria.CRIAR;
            case "atualizar" -> AcaoAuditoria.EDITAR;
            case "deletar"   -> AcaoAuditoria.DELETAR;
            default          -> AcaoAuditoria.EDITAR;
        };
    }

    private Long extrairId(Object[] args) {
        if (args != null && args.length > 0 && args[0] instanceof Long l) return l;
        return null;
    }

    private String normalizeEntidade(String serviceClass) {
        return serviceClass.replace("Service", "").toUpperCase();
    }
}
