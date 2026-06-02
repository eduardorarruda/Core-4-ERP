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

        // CR-B11: única passagem pela lista — add concessões, remove revogações
        diretas.forEach(direta -> {
            String codigo = direta.getPermissao().getCodigo();
            if (Boolean.TRUE.equals(direta.getRevogada())) {
                efetivas.remove(codigo);
            } else {
                efetivas.add(codigo);
            }
        });

        return efetivas;
    }
}
