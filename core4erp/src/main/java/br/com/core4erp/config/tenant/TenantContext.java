package br.com.core4erp.config.tenant;

import br.com.core4erp.exception.AcessoNegadoException;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.Set;

/**
 * Contexto de tenant da requisição, ligado à thread via {@link ThreadLocal} (mesmo padrão do
 * {@code SecurityContextHolder}).
 *
 * <p>Antes era um bean {@code @Scope("request")}. Isso quebrava o chat por streaming: as tools do
 * Spring AI executam em threads do Reactor ({@code boundedElastic}) e, pior, depois que o dispatch
 * HTTP original já encerrou — então o escopo de requisição já não existe
 * ({@code ScopeNotActiveException}/"request is not active anymore"). Como {@link ThreadLocal}, o
 * estado é capturado na thread da requisição e {@link #currentState() propagado} para as threads
 * de trabalho via Micrometer Context Propagation (ver {@code ChatAiConfig}).
 *
 * <p><b>Isolamento:</b> o {@code TenantFilter} chama {@link #clear()} no {@code finally} de toda
 * requisição; a propagação para as threads do Reactor é limpa pelo próprio Micrometer ao fim de
 * cada operador. Sem isso, uma thread reaproveitada de pool poderia herdar o tenant de outra
 * requisição (vazamento cross-tenant).
 */
@Component
public class TenantContext {

    /** Estado por thread. Público para permitir captura/restauração na propagação de contexto. */
    public static final class State {
        private Long usuarioId;
        private String email;
        private Long empresaId;
        private String perfilNome;
        private Set<String> permissoes = new HashSet<>();
        private Boolean adminSistema = false;
        private String tipoConta;
    }

    private static final ThreadLocal<State> HOLDER = new ThreadLocal<>();

    /** Retorna o estado da thread, criando-o se necessário (usado pelos setters). */
    private State write() {
        State s = HOLDER.get();
        if (s == null) {
            s = new State();
            HOLDER.set(s);
        }
        return s;
    }

    // ── Getters/Setters (API preservada) ──────────────────────────────────────

    public Long getUsuarioId()        { State s = HOLDER.get(); return s == null ? null : s.usuarioId; }
    public void setUsuarioId(Long v)  { write().usuarioId = v; }

    public String getEmail()          { State s = HOLDER.get(); return s == null ? null : s.email; }
    public void setEmail(String v)    { write().email = v; }

    public Long getEmpresaId()        { State s = HOLDER.get(); return s == null ? null : s.empresaId; }
    public void setEmpresaId(Long v)  { write().empresaId = v; }

    public String getPerfilNome()         { State s = HOLDER.get(); return s == null ? null : s.perfilNome; }
    public void setPerfilNome(String v)   { write().perfilNome = v; }

    public Set<String> getPermissoes()           { State s = HOLDER.get(); return s == null ? new HashSet<>() : s.permissoes; }
    public void setPermissoes(Set<String> v)     { write().permissoes = (v != null ? v : new HashSet<>()); }

    public Boolean getAdminSistema()        { State s = HOLDER.get(); return s == null ? Boolean.FALSE : s.adminSistema; }
    public void setAdminSistema(Boolean v)  { write().adminSistema = v; }

    public String getTipoConta()        { State s = HOLDER.get(); return s == null ? null : s.tipoConta; }
    public void setTipoConta(String v)  { write().tipoConta = v; }

    // ── Regras ────────────────────────────────────────────────────────────────

    public boolean temPermissao(String codigo) {
        State s = HOLDER.get();
        return s != null && s.permissoes.contains(codigo);
    }

    public void exigirPermissao(String codigo) {
        // adminSistema tem acesso irrestrito a todas as permissões
        if (isAdminSistema()) return;
        if (!temPermissao(codigo)) {
            throw new AcessoNegadoException("Permissão necessária: " + codigo);
        }
    }

    public boolean isPopulado() {
        State s = HOLDER.get();
        return s != null && s.empresaId != null;
    }

    public boolean isAdminSistema() {
        State s = HOLDER.get();
        return s != null && Boolean.TRUE.equals(s.adminSistema);
    }

    public void exigirAdminSistema() {
        if (!isAdminSistema()) {
            throw new AcessoNegadoException("Acesso restrito ao Admin Sistema");
        }
    }

    public void exigirContaEmpresa() {
        State s = HOLDER.get();
        if (s != null && "PESSOA_FISICA".equals(s.tipoConta)) {
            throw new AcessoNegadoException(
                "Esta funcionalidade não está disponível para contas de uso pessoal");
        }
    }

    /** Remove o estado da thread atual. DEVE ser chamado no finally do TenantFilter. */
    public void clear() {
        HOLDER.remove();
    }

    // ── Hooks de propagação de contexto (Micrometer) ──────────────────────────

    public static State currentState() {
        return HOLDER.get();
    }

    public static void restoreState(State s) {
        if (s != null) {
            HOLDER.set(s);
        } else {
            HOLDER.remove();
        }
    }

    public static void removeState() {
        HOLDER.remove();
    }
}
