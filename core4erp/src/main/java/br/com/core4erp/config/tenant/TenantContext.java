package br.com.core4erp.config.tenant;

import br.com.core4erp.exception.AcessoNegadoException;
import lombok.Getter;
import lombok.Setter;
import org.springframework.context.annotation.Scope;
import org.springframework.context.annotation.ScopedProxyMode;
import org.springframework.stereotype.Component;
import org.springframework.web.context.WebApplicationContext;

import java.util.HashSet;
import java.util.Set;

@Component
@Scope(value = WebApplicationContext.SCOPE_REQUEST, proxyMode = ScopedProxyMode.TARGET_CLASS)
@Getter
@Setter
public class TenantContext {

    private Long usuarioId;
    private String email;
    private Long empresaId;
    private String perfilNome;
    private Set<String> permissoes = new HashSet<>();
    private Boolean adminSistema = false;
    private String tipoConta;

    public boolean temPermissao(String codigo) {
        return permissoes.contains(codigo);
    }

    public void exigirPermissao(String codigo) {
        // adminSistema tem acesso irrestrito a todas as permissões
        if (Boolean.TRUE.equals(adminSistema)) return;
        if (!temPermissao(codigo)) {
            throw new AcessoNegadoException("Permissão necessária: " + codigo);
        }
    }

    public boolean isPopulado() {
        return empresaId != null;
    }

    public boolean isAdminSistema() {
        return Boolean.TRUE.equals(adminSistema);
    }

    public void exigirAdminSistema() {
        if (!isAdminSistema()) {
            throw new AcessoNegadoException("Acesso restrito ao Admin Sistema");
        }
    }

    public void exigirContaEmpresa() {
        if ("PESSOA_FISICA".equals(tipoConta)) {
            throw new AcessoNegadoException(
                "Esta funcionalidade não está disponível para contas de uso pessoal");
        }
    }
}
