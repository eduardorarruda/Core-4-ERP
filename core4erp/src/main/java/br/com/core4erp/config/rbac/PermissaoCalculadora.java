package br.com.core4erp.config.rbac;

import br.com.core4erp.empresa.entity.UsuarioEmpresaPermissao;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class PermissaoCalculadora {

    public Set<String> calcular(Set<String> doPerfil, List<UsuarioEmpresaPermissao> diretas) {
        Set<String> efetivas = new HashSet<>(doPerfil);

        diretas.stream()
            .filter(p -> !p.getRevogada())
            .map(p -> p.getPermissao().getCodigo())
            .forEach(efetivas::add);

        diretas.stream()
            .filter(UsuarioEmpresaPermissao::getRevogada)
            .map(p -> p.getPermissao().getCodigo())
            .forEach(efetivas::remove);

        return efetivas;
    }
}
