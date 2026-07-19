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
            pointcut =
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
            "execution(* br.com.core4erp..service..*.gerarExcel(..))",
            returning = "resultado")
    public void publicarEvento(JoinPoint jp, Object resultado) {
        Long usuarioId;
        try {
            usuarioId = securityCtx.getUsuarioId();
        } catch (Exception e) {
            return; // sem usuário autenticado (ex.: scheduler) — não é ação do usuário
        }
        if (usuarioId == null || !tenantCtx.isPopulado()) return;

        String acao = jp.getSignature().getDeclaringType().getSimpleName()
                + "." + jp.getSignature().getName();

        // Marca se a ação foi disparada pela IA (Áurea) ou pela tela (ação manual do usuário).
        // ThreadLocal lido na própria thread de negócio (mesma thread do interceptador).
        boolean origemIa = OrigemIaHolder.isIa();

        // Resumo curto e NÃO-SENSÍVEL (LGPD): apenas nome da ação + id da entidade quando disponível.
        String detalhe;
        try {
            detalhe = montarDetalhe(jp, resultado);
        } catch (Exception e) {
            detalhe = acao; // fallback seguro — nunca deixar o evento derrubar a operação
        }

        eventos.publicar(acao, detalhe, origemIa, usuarioId, tenantCtx.getEmpresaId());
    }

    /**
     * Monta um resumo curto e livre de dados pessoais: {@code "<Entidade> <acao> id=<id>"}
     * (ex.: {@code "Categoria criar id=12"}). Nunca inclui valores, CPF/CNPJ, email ou nome.
     */
    private String montarDetalhe(JoinPoint jp, Object resultado) {
        String entidade = jp.getSignature().getDeclaringType().getSimpleName();
        if (entidade.endsWith("Service")) {
            entidade = entidade.substring(0, entidade.length() - "Service".length());
        }
        String acaoSimples = jp.getSignature().getName();
        Long id = extrairId(resultado, jp.getArgs());
        String detalhe = entidade + " " + acaoSimples + (id != null ? " id=" + id : "");
        return detalhe.length() > 120 ? detalhe.substring(0, 120) : detalhe;
    }

    /**
     * Extrai um id seguro (numérico) do retorno ou dos argumentos. Prioriza o retorno (útil em
     * criações), depois procura um argumento numérico (ex.: {@code deletar(Long id)}) ou um objeto
     * com {@code getId()}. Só aceita valores numéricos — nenhum outro getter é invocado.
     */
    private Long extrairId(Object resultado, Object[] args) {
        Long id = idDe(resultado);
        if (id != null) return id;
        if (args != null) {
            for (Object arg : args) {
                if (arg instanceof Number n) return n.longValue();
                Long viaGetter = idDe(arg);
                if (viaGetter != null) return viaGetter;
            }
        }
        return null;
    }

    private Long idDe(Object obj) {
        if (obj == null) return null;
        try {
            Object valor = obj.getClass().getMethod("getId").invoke(obj);
            if (valor instanceof Number n) return n.longValue();
        } catch (Exception ignored) {
            // objeto sem getId() acessível — sem id seguro a extrair
        }
        return null;
    }
}
