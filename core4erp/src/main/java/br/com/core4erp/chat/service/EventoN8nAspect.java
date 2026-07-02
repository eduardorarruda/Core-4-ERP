package br.com.core4erp.chat.service;

import br.com.core4erp.config.security.SecurityContextUtils;
import br.com.core4erp.config.tenant.TenantContext;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

/**
 * Publica um evento no n8n a cada AÇÃO de escrita/relatório do sistema — feita pela tela (manual)
 * OU pela Áurea. Intercepta os métodos de escrita da camada de service, então cobre "tudo" com um
 * único ponto, sem precisar instrumentar cada service.
 *
 * <p>Roda DEPOIS do método (só publica se a operação teve sucesso). É à prova de falha e ignora
 * chamadas sem contexto de usuário/empresa (ex.: schedulers) — nunca afeta a operação.
 */
@Aspect
@Component
public class EventoN8nAspect {

    private final N8nEventDispatcher eventos;
    private final SecurityContextUtils securityCtx;
    private final TenantContext tenantCtx;

    public EventoN8nAspect(N8nEventDispatcher eventos, SecurityContextUtils securityCtx, TenantContext tenantCtx) {
        this.eventos = eventos;
        this.securityCtx = securityCtx;
        this.tenantCtx = tenantCtx;
    }

    @AfterReturning(
            "execution(* br.com.core4erp..service..*.criar(..)) || " +
            "execution(* br.com.core4erp..service..*.atualizar(..)) || " +
            "execution(* br.com.core4erp..service..*.atualizarTipo(..)) || " +
            "execution(* br.com.core4erp..service..*.deletar(..)) || " +
            "execution(* br.com.core4erp..service..*.excluir(..)) || " +
            "execution(* br.com.core4erp..service..*.baixar(..)) || " +
            "execution(* br.com.core4erp..service..*.estornar(..)) || " +
            "execution(* br.com.core4erp..service..*.transferir(..)) || " +
            "execution(* br.com.core4erp..service..*.fecharFatura(..)) || " +
            "execution(* br.com.core4erp..service..*.reativar(..)) || " +
            "execution(* br.com.core4erp..service..*.remover(..)) || " +
            "execution(* br.com.core4erp..service..*.cancelar(..)) || " +
            "execution(* br.com.core4erp..service..*.aceitar(..)) || " +
            "execution(* br.com.core4erp..service..*.gerarRelatorio*(..)) || " +
            "execution(* br.com.core4erp..service..*.gerarExcel(..))")
    public void publicarEvento(JoinPoint jp) {
        Long usuarioId;
        try {
            usuarioId = securityCtx.getUsuarioId();
        } catch (Exception e) {
            return; // sem usuário autenticado (ex.: scheduler) — não é ação do usuário
        }
        if (usuarioId == null || !tenantCtx.isPopulado()) return;
        String acao = jp.getSignature().getDeclaringType().getSimpleName()
                + "." + jp.getSignature().getName();
        eventos.publicar(acao, null, usuarioId, tenantCtx.getEmpresaId());
    }
}
